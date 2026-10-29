// Service de staff: alta, modificación, baja, reactivación y desbloqueo del staff, y la activación de su cuenta por email.
// Lógica de negocio y acceso a modelos. Filtra siempre por el clubId del usuario logueado (nunca el del body),
// registra las acciones relevantes en la bitácora (utils/logger) y lanza los errores con createError (utils/errors).
const { Op } = require('sequelize')

const sequelize = require('../../config/db')
const { User, Member, Staff, Role, UserRole, Club, ClubSport, Sport } = require('../../models')
const { assignBaseRole, removeBaseRole } = require('../access/access.service')
const { getActiveSports } = require('../clubs/clubs.service')

const logger = require('../../utils/logger')
const { createError, isUniqueError } = require('../../utils/errors')
const { generateActivationToken } = require('../../utils/token')
const { sendActivationEmail } = require('../../utils/mailer/senders')
const { getAge } = require('../../utils/dates')
const { USER_STATES, MEMBER_STATES, STAFF_ROLES, LOG_ACTIONS } = require('../../utils/constants')
const { staff: m } = require('../../utils/messages')

const STAFF_PAGE_SIZE = 20

// Filtro de estado del listado: active (staff activo que ya activó su cuenta), pending (staff activo que todavía no la
// activó) e inactive (ex staff: sin roles de staff)
const STATE_FILTERS = { ACTIVE: 'active', PENDING: 'pending', INACTIVE: 'inactive' }

// Un socio en estos estados no puede ser staff (contexto 3.6). Un ex socio (INACTIVE) sí
const MEMBER_BLOCKING_STATES = [MEMBER_STATES.ACTIVE, MEMBER_STATES.SUSPENDED]

const actorOf = ({ id: userId, clubId, activeRoleId }) => ({ clubId, userId, roleId: activeRoleId })

const fullNameOf = (user) => `${user.name} ${user.lastName}`

const unique = (values) => [...new Set(values)]

// Los roles de staff en el orden de STAFF_ROLES (para mostrarlos y registrarlos siempre igual)
const sortStaffRoles = (names) => STAFF_ROLES.filter(name => names.includes(name))

// Mensaje de cada campo único del usuario (DNI, email y usuario son únicos en toda la plataforma)
const UNIQUE_USER_MESSAGES = { dni: m.dniTaken, email: m.emailTaken, username: m.usernameTaken }

function uniqueUserError(error) {
    const field = Object.keys(UNIQUE_USER_MESSAGES).find(name => isUniqueError(error, name))
    return field ? createError(UNIQUE_USER_MESSAGES[field], 409) : null
}

// ---------- Staff activo ----------

// Staff activo = usuario con al menos un rol de STAFF_ROLES. Es la única forma de saber si alguien es staff:
// el registro staff queda aunque se le hayan quitado los roles (ex staff), porque lo referencian citaciones y categorías.
async function isActiveStaff(userId, { transaction } = {}) {
    const count = await UserRole.count({
        where: { userId },
        include: [{ model: Role, as: 'role', attributes: [], where: { name: STAFF_ROLES, isBase: true } }],
        transaction
    })

    return count > 0
}

// Roles de cada usuario en su club: Map userId → [nombres]
async function getRoleNamesByUser(clubId, userIds, { transaction } = {}) {
    const rows = await UserRole.findAll({
        where: { userId: userIds },
        attributes: ['userId'],
        include: [{ model: Role, as: 'role', attributes: ['name', 'isBase'], where: { clubId } }],
        order: [[{ model: Role, as: 'role' }, 'isBase', 'DESC'], [{ model: Role, as: 'role' }, 'name', 'ASC']],
        transaction
    })

    const byUser = new Map(userIds.map(id => [id, []]))
    rows.forEach(row => byUser.get(row.userId)?.push(row.role.name))
    return byUser
}

// Roles de staff de varios usuarios a la vez: Map userId → [roles de staff]. Una lista vacía = no es staff activo
// (misma regla que isActiveStaff, para los listados)
async function getStaffRolesOfUsers(clubId, userIds, { transaction } = {}) {
    const byUser = await getRoleNamesByUser(clubId, userIds, { transaction })
    return new Map([...byUser].map(([userId, names]) => [userId, sortStaffRoles(names)]))
}

// Separa los roles de staff de los demás (los demás solo se muestran)
function splitRoles(names) {
    return {
        staffRoles: sortStaffRoles(names),
        otherRoles: names.filter(name => !STAFF_ROLES.includes(name))
    }
}

// ---------- Búsquedas ----------

async function findClubStaff(clubId, staffId, options = {}) {
    const staff = await Staff.findOne({
        where: { id: staffId, clubId },
        include: [
            { model: User, as: 'user' },
            { model: ClubSport, as: 'clubSport', attributes: ['id'], include: [{ model: Sport, as: 'sport', attributes: ['name'] }] }
        ],
        ...options
    })

    if (!staff) throw createError(m.staffNotFound, 404)
    return staff
}

// El deporte tiene que ser uno de los activos del club
async function assertActiveClubSport(clubId, clubSportId) {
    const sports = await getActiveSports(clubId)
    if (!sports.some(sport => sport.clubSportId === clubSportId)) throw createError(m.sportNotActive, 400)
}

// Usuarios del club que coinciden por DNI o por email con la persona del alta
async function findMatchingUsers(clubId, { dni, email }) {
    return User.findAll({
        where: { clubId, [Op.or]: [{ dni }, { email }] },
        include: [{ model: Member, as: 'member', attributes: ['id', 'memberStateId'] }]
    })
}

// No puede ser staff quien es socio Activo o Suspendido, ni quien ya es staff activo
async function assertCanBeStaff(user, { transaction } = {}) {
    const member = user.member ?? await Member.findOne({ where: { userId: user.id }, attributes: ['memberStateId'], transaction })
    if (member && MEMBER_BLOCKING_STATES.includes(member.memberStateId)) throw createError(m.isMember, 409)
    if (await isActiveStaff(user.id, { transaction })) throw createError(m.alreadyStaff, 409)
}

// ---------- Activación de la cuenta ----------

// Necesita activar su cuenta quien todavía no eligió su contraseña (usuario PENDING sin contraseña)
const needsActivation = (user) => user.userStateId === USER_STATES.PENDING && !user.password

// Estado de un usuario DELETED que vuelve a tener un rol: ACTIVE si ya tenía contraseña; si no, PENDING (tiene que activarla)
const restoredState = (user) => user.password ? USER_STATES.ACTIVE : USER_STATES.PENDING

// Envía el email de activación con un token nuevo (los anteriores siguen sirviendo hasta que venzan o se active la cuenta).
// Devuelve false si el envío falló: el sender ya lo registró como MAIL_ERROR.
async function sendActivation(actor, user) {
    const club = await Club.findByPk(user.clubId, { attributes: ['name'] })

    try {
        await sendActivationEmail(user, generateActivationToken(user), club.name)
    } catch {
        return false
    }

    await logger(actorOf(actor), LOG_ACTIONS.ACTIVATION_EMAIL_SENT, `A ${user.email}: ${fullNameOf(user)} (usuario id ${user.id})`)
    return true
}

// Resultado de la activación para el front: si hacía falta y si se envió el email
async function activationFor(actor, user) {
    if (!needsActivation(user)) return { required: false, sent: false, email: user.email }
    return { required: true, sent: await sendActivation(actor, user), email: user.email }
}

// ---------- Listado y detalle ----------

// Usuarios del club con al menos uno de los roles indicados
async function userIdsWithRoles(clubId, roleNames) {
    const rows = await UserRole.findAll({
        attributes: ['userId'],
        include: [{ model: Role, as: 'role', attributes: [], where: { clubId, name: roleNames, isBase: true } }],
        raw: true
    })

    return unique(rows.map(row => row.userId))
}

// Staff del club de a STAFF_PAGE_SIZE. Cada palabra de la búsqueda tiene que aparecer en el nombre, el apellido, el DNI
// o el email. Filtros: un rol de staff y el estado (STATE_FILTERS).
async function listStaff({ clubId }, { search = '', role, state, page = 1 }) {
    page = Number(page) || 1   // Con Express 5 req.query es de solo lectura: el toInt del validator no llega hasta acá
    const words = String(search).trim().split(/\s+/).filter(Boolean)
    const fields = ['$user.name$', '$user.lastName$', '$user.dni$', '$user.email$']

    const staffUserIds = await userIdsWithRoles(clubId, STAFF_ROLES)
    const conditions = []

    if (role) conditions.push({ userId: await userIdsWithRoles(clubId, [role]) })

    if (state === STATE_FILTERS.INACTIVE) {
        if (staffUserIds.length > 0) conditions.push({ userId: { [Op.notIn]: staffUserIds } })   // NOT IN () vacío no filtra bien
    } else if (state) {
        conditions.push({ userId: staffUserIds })
    }

    words.forEach(word => conditions.push({ [Op.or]: fields.map(field => ({ [field]: { [Op.like]: `%${word}%` } })) }))

    const userWhere = {}
    if (state === STATE_FILTERS.PENDING) userWhere.userStateId = USER_STATES.PENDING
    if (state === STATE_FILTERS.ACTIVE) userWhere.userStateId = { [Op.ne]: USER_STATES.PENDING }

    const { count, rows } = await Staff.findAndCountAll({
        where: { clubId, ...(conditions.length > 0 && { [Op.and]: conditions }) },
        include: [
            { model: User, as: 'user', attributes: ['id', 'name', 'lastName', 'email', 'userStateId'], where: userWhere },
            { model: ClubSport, as: 'clubSport', attributes: ['id'], include: [{ model: Sport, as: 'sport', attributes: ['name'] }] }
        ],
        order: [[{ model: User, as: 'user' }, 'lastName', 'ASC'], [{ model: User, as: 'user' }, 'name', 'ASC'], ['id', 'ASC']],
        limit: STAFF_PAGE_SIZE,
        offset: (page - 1) * STAFF_PAGE_SIZE
    })

    const rolesByUser = await getRoleNamesByUser(clubId, rows.map(staff => staff.userId))

    return {
        items: rows.map(staff => {
            const { staffRoles } = splitRoles(rolesByUser.get(staff.userId))

            return {
                id: staff.id,
                fullName: fullNameOf(staff.user),
                email: staff.user.email,
                staffRoles,
                sport: staff.clubSport.sport.name,
                userStateId: staff.user.userStateId,
                isActiveStaff: staffRoles.length > 0
            }
        }),
        total: count,
        page,
        pageSize: STAFF_PAGE_SIZE,
        totalPages: Math.max(1, Math.ceil(count / STAFF_PAGE_SIZE))
    }
}

async function getStaff({ clubId }, staffId) {
    const staff = await findClubStaff(clubId, staffId)
    const { user } = staff
    const { staffRoles, otherRoles } = splitRoles((await getRoleNamesByUser(clubId, [user.id])).get(user.id))

    return {
        id: staff.id,
        createdAt: staff.createdAt,   // Fecha de alta
        isActiveStaff: staffRoles.length > 0,
        staffRoles,
        otherRoles,   // Solo para mostrar (por ejemplo, Familia)
        clubSport: { id: staff.clubSport.id, name: staff.clubSport.sport.name },
        user: {
            id: user.id,
            name: user.name,
            lastName: user.lastName,
            fullName: fullNameOf(user),
            dni: user.dni,
            birthDate: user.birthDate,
            age: getAge(user.birthDate),
            email: user.email,
            phone: user.phone,   // El modelo lo descifra
            username: user.username,
            userStateId: user.userStateId,
            isActivated: Boolean(user.password)
        }
    }
}

// Roles de staff y deportes activos del club, para el formulario
async function getOptions({ clubId }) {
    const sports = await getActiveSports(clubId)
    return {
        roles: STAFF_ROLES,
        sports: sports.map(sport => ({ id: sport.clubSportId, name: sport.name }))
    }
}

// ---------- Alta ----------

async function assignStaffRoles(userId, roleNames, transaction) {
    for (const roleName of roleNames) {
        await assignBaseRole(userId, roleName, { transaction })
    }
}

// Alta de staff. Si la persona ya tiene usuario en el club (por DNI o email):
//   - si es socia (Activa o Suspendida) o ya es staff activo, se rechaza;
//   - si no, se responde 409 EXISTING_USER con sus datos, y el front reenvía el alta con existingUserId para crear
//     (o reutilizar, si fue staff antes) el staff sobre ese usuario. No se le manda activación si ya tiene contraseña.
// Si no tiene usuario, se crea en PENDING y se le envía el email de activación después de confirmar la transacción.
async function createStaff(actor, { name, lastName, dni, birthDate, email, phone, roles, clubSportId, existingUserId }) {
    const { clubId } = actor
    const roleNames = sortStaffRoles(roles)

    await assertActiveClubSport(clubId, clubSportId)

    const matches = await findMatchingUsers(clubId, { dni, email })
    for (const user of matches) await assertCanBeStaff(user)

    let result

    if (existingUserId) {
        // El usuario indicado tiene que ser la persona que se detectó con estos mismos datos
        const match = matches.find(item => item.id === existingUserId)
        if (!match || matches.length > 1) throw createError(m.existingUserMismatch, 400)

        try {
            result = await sequelize.transaction(async (transaction) => {
                // Con el usuario bloqueado, otra alta simultánea sobre él espera y después lo ve como staff activo
                const user = await User.findByPk(match.id, { transaction, lock: transaction.LOCK.UPDATE })
                await assertCanBeStaff(user, { transaction })

                // Se usan sus datos tal como están. Solo se completa el email si no tenía (lo necesita para la activación),
                // y si estaba dado de baja (DELETED) vuelve a tener acceso
                const changes = {}
                if (!user.email) changes.email = email
                if (user.userStateId === USER_STATES.DELETED) changes.userStateId = restoredState(user)
                if (Object.keys(changes).length > 0) await user.update(changes, { transaction })

                const [staff, created] = await Staff.findOrCreate({
                    where: { userId: user.id },
                    defaults: { clubId, userId: user.id, clubSportId },
                    transaction
                })

                if (!created && staff.clubSportId !== clubSportId) await staff.update({ clubSportId }, { transaction })

                await assignStaffRoles(user.id, roleNames, transaction)
                return { staff, user, reused: !created }
            })

        } catch (error) {
            throw uniqueUserError(error) ?? error
        }

        await logger(actorOf(actor), LOG_ACTIONS.STAFF_CREATED,
            `Staff: ${fullNameOf(result.user)} (${roleNames.join(', ')}), sobre su usuario existente (id ${result.user.id})${result.reused ? ', que ya había sido staff' : ''}`)

    } else {
        if (matches.length > 0) {
            const [user] = matches
            throw createError(m.existingUser(fullNameOf(user)), 409, 'EXISTING_USER', {
                id: user.id,
                name: user.name,
                lastName: user.lastName,
                fullName: fullNameOf(user),
                dni: user.dni,
                email: user.email,
                birthDate: user.birthDate
            })
        }

        try {
            result = await sequelize.transaction(async (transaction) => {
                // Usuario pendiente de activación: sin nombre de usuario ni contraseña hasta que activa su cuenta
                const user = await User.create({
                    clubId,
                    name,
                    lastName,
                    dni,
                    birthDate,
                    email,
                    phone: phone || null,
                    userStateId: USER_STATES.PENDING
                }, { transaction })

                const staff = await Staff.create({ clubId, userId: user.id, clubSportId }, { transaction })

                await assignStaffRoles(user.id, roleNames, transaction)
                return { staff, user, reused: false }
            })

        } catch (error) {
            throw uniqueUserError(error) ?? error   // DNI o email de un usuario de otro club
        }

        await logger(actorOf(actor), LOG_ACTIONS.STAFF_CREATED, `Staff: ${name} ${lastName} (${roleNames.join(', ')})`)
    }

    const activation = await activationFor(actor, result.user)

    return {
        ...await getStaff(actor, result.staff.id),
        usedExistingUser: Boolean(existingUserId),
        activation
    }
}

// ---------- Modificación ----------

// Campos del usuario que el Admin puede modificar, con su nombre para la bitácora
const EDITABLE_FIELDS = {
    name: 'nombre',
    lastName: 'apellido',
    dni: 'DNI',
    birthDate: 'fecha de nacimiento',
    email: 'email',
    phone: 'teléfono',
    username: 'usuario'
}

// Datos personales, roles de staff (al menos uno) y deporte. El nombre de usuario solo si ya activó su cuenta.
// Un ex staff no se modifica: primero se reactiva.
async function updateStaff(actor, staffId, { name, lastName, dni, birthDate, email, phone, username, roles, clubSportId }) {
    const { clubId } = actor
    const staff = await findClubStaff(clubId, staffId)
    const { user } = staff

    if (!await isActiveStaff(user.id)) throw createError(m.notActiveStaff, 409)

    const isActivated = Boolean(user.password)
    if (username && !isActivated) throw createError(m.usernameNotActivated, 400)

    if (clubSportId !== staff.clubSportId) await assertActiveClubSport(clubId, clubSportId)

    const wanted = {
        name,
        lastName,
        dni,
        birthDate,
        email,
        phone: phone || null,
        username: isActivated && username ? username : user.username   // Sin usuario nuevo, queda el que tenía
    }

    const changes = Object.fromEntries(Object.entries(wanted).filter(([field, value]) => user[field] !== value))
    const changedFields = Object.keys(changes)

    // Que el DNI, el email y el usuario no sean de otra persona (son únicos en toda la plataforma)
    const uniqueFields = ['dni', 'email', 'username'].filter(field => changes[field])
    if (uniqueFields.length > 0) {
        const taken = await User.findOne({
            where: { id: { [Op.ne]: user.id }, [Op.or]: uniqueFields.map(field => ({ [field]: changes[field] })) },
            attributes: uniqueFields
        })

        if (taken) {
            const field = uniqueFields.find(item => taken[item] === changes[item])
            throw createError(UNIQUE_USER_MESSAGES[field], 409)
        }
    }

    const wantedRoles = sortStaffRoles(roles)
    const previousBirthDate = user.birthDate
    const previousSport = staff.clubSport.sport.name

    let roleChanges

    try {
        roleChanges = await sequelize.transaction(async (transaction) => {
            const current = sortStaffRoles((await getRoleNamesByUser(clubId, [user.id], { transaction })).get(user.id))
            const added = wantedRoles.filter(roleName => !current.includes(roleName))
            const removed = current.filter(roleName => !wantedRoles.includes(roleName))

            if (changedFields.length > 0) await user.update(changes, { transaction })
            if (clubSportId !== staff.clubSportId) await staff.update({ clubSportId }, { transaction })

            await assignStaffRoles(user.id, added, transaction)
            for (const roleName of removed) {
                await removeBaseRole(user.id, roleName, { transaction })
            }

            return { added, removed }
        })

    } catch (error) {
        throw uniqueUserError(error) ?? error
    }

    const { added, removed } = roleChanges
    const sportChanged = clubSportId !== staff.clubSportId
    const newSport = sportChanged ? (await getActiveSports(clubId)).find(sport => sport.clubSportId === clubSportId).name : previousSport

    // El cambio de la fecha de nacimiento queda con las dos fechas, porque cambia los permisos condicionados por edad
    const details = [
        ...changedFields.map(field => field === 'birthDate'
            ? `fecha de nacimiento: ${previousBirthDate} → ${changes.birthDate}`
            : EDITABLE_FIELDS[field]),
        added.length > 0 && `roles agregados: ${added.join(', ')}`,
        removed.length > 0 && `roles quitados: ${removed.join(', ')}`,
        sportChanged && `deporte: ${previousSport} → ${newSport}`
    ].filter(Boolean)

    if (details.length > 0) {
        await logger(actorOf(actor), LOG_ACTIONS.STAFF_UPDATED, `Staff: ${fullNameOf(user)}. ${details.join(', ')}`)
    }

    return getStaff(actor, staff.id)
}

// ---------- Baja, reactivación, desbloqueo y reenvío de la activación ----------

// Le quita todos sus roles de staff. Si no le queda ningún otro rol, el usuario pasa a DELETED; si le queda alguno
// (por ejemplo, Familia), sigue entrando con ese rol. El registro staff no se borra (es un ex staff).
async function deactivateStaff(actor, staffId) {
    const staff = await findClubStaff(actor.clubId, staffId)

    const result = await sequelize.transaction(async (transaction) => {
        const user = await User.findByPk(staff.userId, { transaction, lock: transaction.LOCK.UPDATE })
        if (!await isActiveStaff(user.id, { transaction })) throw createError(m.alreadyInactive, 409)

        const removed = []
        for (const roleName of STAFF_ROLES) {
            if (await removeBaseRole(user.id, roleName, { transaction })) removed.push(roleName)
        }

        const remaining = (await getRoleNamesByUser(actor.clubId, [user.id], { transaction })).get(user.id)
        if (remaining.length === 0) await user.update({ userStateId: USER_STATES.DELETED }, { transaction })

        return { user, removed, remaining }
    })

    const { user, removed, remaining } = result
    const access = remaining.length === 0 ? 'sin otros roles, el usuario queda dado de baja' : `conserva: ${remaining.join(', ')}`

    await logger(actorOf(actor), LOG_ACTIONS.STAFF_DEACTIVATED, `Staff: ${fullNameOf(user)}. Roles quitados: ${removed.join(', ')}; ${access}`)

    return getStaff(actor, staff.id)
}

// El Admin vuelve a elegir los roles de staff. Si el usuario estaba DELETED, vuelve a ACTIVE si ya tenía contraseña,
// o a PENDING con un email de activación nuevo si nunca la activó. Si no estaba DELETED, solo recupera los roles.
async function reactivateStaff(actor, staffId, { roles }) {
    const staff = await findClubStaff(actor.clubId, staffId)
    const roleNames = sortStaffRoles(roles)

    const result = await sequelize.transaction(async (transaction) => {
        const user = await User.findByPk(staff.userId, { transaction, lock: transaction.LOCK.UPDATE })
        if (await isActiveStaff(user.id, { transaction })) throw createError(m.alreadyActive, 409)

        // Mientras fue ex staff pudo haberse asociado
        const member = await Member.findOne({ where: { userId: user.id }, attributes: ['memberStateId'], transaction })
        if (member && MEMBER_BLOCKING_STATES.includes(member.memberStateId)) throw createError(m.isMember, 409)

        const wasDeleted = user.userStateId === USER_STATES.DELETED
        if (wasDeleted) await user.update({ userStateId: restoredState(user) }, { transaction })

        await assignStaffRoles(user.id, roleNames, transaction)
        return { user, wasDeleted }
    })

    const { user, wasDeleted } = result
    await logger(actorOf(actor), LOG_ACTIONS.STAFF_REACTIVATED,
        `Staff: ${fullNameOf(user)} (${roleNames.join(', ')})${wasDeleted ? `; el usuario vuelve a ${user.userStateId === USER_STATES.ACTIVE ? 'Activo' : 'Pendiente de activación'}` : ''}`)

    // Solo se manda la activación si volvió de DELETED sin haberla hecho nunca
    const activation = wasDeleted ? await activationFor(actor, user) : { required: false, sent: false, email: user.email }

    return { ...await getStaff(actor, staff.id), activation }
}

// Usuario BLOCKED por intentos fallidos → ACTIVE, con los intentos en 0
async function unblockStaff(actor, staffId) {
    const staff = await findClubStaff(actor.clubId, staffId)
    const { user } = staff

    if (user.userStateId !== USER_STATES.BLOCKED) throw createError(m.notBlocked, 409)

    await user.update({ userStateId: USER_STATES.ACTIVE, failedAttempts: 0 })
    await logger(actorOf(actor), LOG_ACTIONS.USER_UNBLOCKED, `Desbloqueado por el Admin: staff ${fullNameOf(user)}, usuario "${user.username}" (id ${user.id})`)

    return getStaff(actor, staff.id)
}

// Solo a un staff activo que todavía no activó su cuenta
async function resendActivation(actor, staffId) {
    const staff = await findClubStaff(actor.clubId, staffId)
    const { user } = staff

    if (!await isActiveStaff(user.id)) throw createError(m.notActiveStaff, 409)
    if (!needsActivation(user)) throw createError(m.notPending, 409)

    if (!await sendActivation(actor, user)) throw createError(m.activationFailed, 502)

    return { email: user.email }
}

module.exports = {
    isActiveStaff,
    getStaffRolesOfUsers,
    listStaff,
    getStaff,
    getOptions,
    createStaff,
    updateStaff,
    deactivateStaff,
    reactivateStaff,
    unblockStaff,
    resendActivation
}
