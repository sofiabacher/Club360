// Service de members: socios, vínculo familiar y mayoría de edad.
// Lógica de negocio y acceso a modelos. Filtra siempre por el clubId del usuario logueado (nunca el del body),
// registra las acciones relevantes en la bitácora (utils/logger) y lanza los errores con createError (utils/errors).
const crypto = require('crypto')
const { Op, UniqueConstraintError } = require('sequelize')

const sequelize = require('../../config/db')
const { cors } = require('../../config')
const { User, Member, Staff, Role, Club } = require('../../models')
const { assignBaseRole } = require('../access/access.service')

const logger = require('../../utils/logger')
const { createError } = require('../../utils/errors')
const { getAge, isAdult } = require('../../utils/dates')
const { USER_STATES, MEMBER_STATES, BASE_ROLES, LOG_ACTIONS } = require('../../utils/constants')
const { members: m } = require('../../utils/messages')

const MEMBERS_PAGE_SIZE = 20

// Número de socio: 6 dígitos con ceros a la izquierda, único en toda la plataforma
const MEMBER_NUMBER_LENGTH = 6

// Código de vínculo familiar: XXXX-XXXX, sin los caracteres que se confunden (0/O, 1/I/L)
const FAMILY_CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'
const FAMILY_CODE_ATTEMPTS = 10

// Si el alta choca con otra simultánea (mismo número de socio o mismo código), se reintenta
const CREATE_ATTEMPTS = 3

// Filtro de registro del listado
const REGISTRATION_FILTERS = { PENDING: 'pending', REGISTERED: 'registered' }

const actorOf = ({ id: userId, clubId, activeRoleId }) => ({ clubId, userId, roleId: activeRoleId })

const fullNameOf = (user) => `${user.name} ${user.lastName}`

// true si el error es de un índice único sobre ese campo (sirve tanto con el nombre del campo como con el del índice)
function isUniqueError(error, field) {
    if (!(error instanceof UniqueConstraintError)) return false
    const text = `${Object.keys(error.fields ?? {}).join(' ')} ${error.parent?.sqlMessage ?? ''}`
    return text.includes(field)
}

// Mensaje de cada campo único del usuario (DNI, email y usuario son únicos en toda la plataforma)
const UNIQUE_USER_MESSAGES = { dni: m.dniTaken, email: m.emailTaken, username: m.usernameTaken }

// Traduce un choque de índice único del usuario al mensaje que corresponde
function uniqueUserError(error) {
    const field = Object.keys(UNIQUE_USER_MESSAGES).find(name => isUniqueError(error, name))
    return field ? createError(UNIQUE_USER_MESSAGES[field], 409) : null
}

// ---------- Número de socio y código de vínculo ----------

// Máximo número de socio actual + 1. Va dentro de la transacción del alta; si dos altas simultáneas sacan el mismo
// número, el índice único rechaza la segunda y createMember la reintenta.
// Solo cuenta los números de 6 dígitos (los cargados a mano con otro formato no entran en la secuencia).
async function generateMemberNumber(transaction) {
    const last = await Member.findOne({
        where: { numMember: { [Op.regexp]: `^[0-9]{${MEMBER_NUMBER_LENGTH}}$` } },
        attributes: ['numMember'],
        order: [['numMember', 'DESC']],
        transaction
    })

    const next = Number(last?.numMember ?? 0) + 1
    return String(next).padStart(MEMBER_NUMBER_LENGTH, '0')
}

function randomFamilyCode() {
    const pick = () => FAMILY_CODE_ALPHABET[crypto.randomInt(FAMILY_CODE_ALPHABET.length)]
    const block = () => Array.from({ length: 4 }, pick).join('')
    return `${block()}-${block()}`
}

// Código de vínculo que no esté en uso
async function generateFamilyCode(transaction) {
    for (let attempt = 0; attempt < FAMILY_CODE_ATTEMPTS; attempt++) {
        const code = randomFamilyCode()
        const taken = await Member.findOne({ where: { codeFamily: code }, attributes: ['id'], transaction })
        if (!taken) return code
    }

    throw createError(m.memberNumberFailed, 500)
}

// ---------- Búsquedas ----------

async function findClubMember(clubId, memberId, options = {}) {
    const member = await Member.findOne({
        where: { id: memberId, clubId },
        include: [{ model: User, as: 'user' }],
        ...options
    })

    if (!member) throw createError(m.memberNotFound, 404)
    return member
}

// Usuarios del club que coinciden por DNI o por email con la persona del alta
async function findMatchingUsers(clubId, { dni, email }) {
    const conditions = [{ dni }]
    if (email) conditions.push({ email })

    return User.findAll({
        where: { clubId, [Op.or]: conditions },
        include: [
            { model: Staff, as: 'staff', attributes: ['id'] },
            { model: Member, as: 'member', attributes: ['id', 'numMember'] }
        ]
    })
}

// Si es Staff o ya es socia, no puede ser dada de alta
function assertCanBeMember(user) {
    if (user.staff) throw createError(m.isStaff, 409)
    if (user.member) throw createError(m.alreadyMember(user.member.numMember), 409)
}

// ---------- Listado y detalle ----------

const hasUnusedFamilyCode = (member) => Boolean(member.codeFamily) && !member.linkStatus

// Socios del club de a MEMBERS_PAGE_SIZE. Cada palabra de la búsqueda tiene que aparecer en el nombre, el apellido,
// el DNI o el número de socio. Filtros: estado del socio y registro (pending: usuario PENDING; registered: el resto).
async function listMembers({ clubId }, { search = '', state, registration, page = 1 }) {
    page = Number(page) || 1   // Con Express 5 req.query es de solo lectura: el toInt del validator no llega hasta acá
    const words = String(search).trim().split(/\s+/).filter(Boolean)
    const fields = ['$user.name$', '$user.lastName$', '$user.dni$', 'numMember']

    const where = {
        clubId,
        ...(state && { memberStateId: Number(state) }),
        ...(words.length > 0 && {
            [Op.and]: words.map(word => ({ [Op.or]: fields.map(field => ({ [field]: { [Op.like]: `%${word}%` } })) }))
        })
    }

    const userWhere = {}
    if (registration === REGISTRATION_FILTERS.PENDING) userWhere.userStateId = USER_STATES.PENDING
    if (registration === REGISTRATION_FILTERS.REGISTERED) userWhere.userStateId = { [Op.ne]: USER_STATES.PENDING }

    const { count, rows } = await Member.findAndCountAll({
        where,
        include: [{
            model: User,
            as: 'user',
            attributes: ['id', 'name', 'lastName', 'dni', 'birthDate', 'userStateId'],
            where: userWhere
        }],
        order: [[{ model: User, as: 'user' }, 'lastName', 'ASC'], [{ model: User, as: 'user' }, 'name', 'ASC'], ['id', 'ASC']],
        limit: MEMBERS_PAGE_SIZE,
        offset: (page - 1) * MEMBERS_PAGE_SIZE
    })

    return {
        items: rows.map(member => ({
            id: member.id,
            numMember: member.numMember,
            fullName: fullNameOf(member.user),
            dni: member.user.dni,
            age: getAge(member.user.birthDate),
            isMinor: !isAdult(member.user.birthDate),
            memberStateId: member.memberStateId,
            userStateId: member.user.userStateId,
            hasUnusedFamilyCode: hasUnusedFamilyCode(member)
        })),
        total: count,
        page,
        pageSize: MEMBERS_PAGE_SIZE,
        totalPages: Math.max(1, Math.ceil(count / MEMBERS_PAGE_SIZE))
    }
}

async function getMember({ clubId }, memberId) {
    const member = await findClubMember(clubId, memberId)
    const { user } = member

    const [roles, adult] = await Promise.all([
        Role.findAll({
            where: { clubId },
            attributes: ['id', 'name'],
            include: [{ model: User, as: 'users', attributes: [], where: { id: user.id }, through: { attributes: [] } }],
            order: [['isBase', 'DESC'], ['name', 'ASC']]
        }),
        member.adultUserId ? User.findByPk(member.adultUserId, { attributes: ['id', 'name', 'lastName'] }) : null
    ])

    return {
        id: member.id,
        numMember: member.numMember,
        memberStateId: member.memberStateId,
        createdAt: member.createdAt,   // Fecha de alta
        user: {
            id: user.id,
            name: user.name,
            lastName: user.lastName,
            fullName: fullNameOf(user),
            dni: user.dni,
            birthDate: user.birthDate,
            age: getAge(user.birthDate),
            isMinor: !isAdult(user.birthDate),
            email: user.email,
            phone: user.phone,   // El modelo lo descifra
            username: user.username,
            userStateId: user.userStateId,
            isRegistered: user.userStateId !== USER_STATES.PENDING
        },
        // Vínculo familiar: el código mientras no se usó, o el adulto vinculado
        family: {
            code: hasUnusedFamilyCode(member) ? member.codeFamily : null,
            linked: member.linkStatus,
            adult: adult ? { id: adult.id, fullName: fullNameOf(adult) } : null
        },
        roles: roles.map(role => ({ id: role.id, name: role.name }))
    }
}

// Datos del comprobante del alta (carnet imprimible)
async function getReceipt({ clubId }, memberId) {
    const member = await findClubMember(clubId, memberId, {
        include: [
            { model: User, as: 'user', attributes: ['name', 'lastName', 'userStateId'] },
            { model: Club, as: 'club', attributes: ['name', 'accentColor'] }
        ]
    })

    return {
        id: member.id,
        club: { name: member.club.name, accentColor: member.club.accentColor },
        fullName: fullNameOf(member.user),
        numMember: member.numMember,
        createdAt: member.createdAt,
        isPendingRegistration: member.user.userStateId === USER_STATES.PENDING,
        familyCode: hasUnusedFamilyCode(member) ? member.codeFamily : null,
        registerUrl: `${cors.origin}/register`
    }
}

// ---------- Alta ----------

// Crea el member (con su número y, si es menor, su código de vínculo) y le asigna el rol Socio, dentro de la transacción
async function createMembership(user, transaction) {
    const numMember = await generateMemberNumber(transaction)
    const codeFamily = isAdult(user.birthDate) ? null : await generateFamilyCode(transaction)

    const member = await Member.create({
        clubId: user.clubId,
        userId: user.id,
        numMember,
        memberStateId: MEMBER_STATES.ACTIVE,
        codeFamily,
        linkStatus: false,
        adultUserId: null
    }, { transaction })

    await assignBaseRole(user.id, BASE_ROLES.MEMBER, { transaction })
    return member
}

// Reintenta la transacción si chocó con otra alta simultánea (número de socio o código de vínculo repetido)
async function withRetry(task) {
    for (let attempt = 1; ; attempt++) {
        try {
            return await sequelize.transaction(task)

        } catch (error) {
            const collided = isUniqueError(error, 'numMember') || isUniqueError(error, 'codeFamily')
            if (!collided) throw error
            if (attempt >= CREATE_ATTEMPTS) throw createError(m.memberNumberFailed, 409)
        }
    }
}

// Alta presencial. Si la persona ya tiene usuario en el club (por DNI o email):
//   - si es Staff o ya es socia, se rechaza;
//   - si no, se responde 409 EXISTING_USER con sus datos, y el front reenvía el alta con existingUserId para crear el
//     socio sobre ese usuario, sin tocar sus datos ni su contraseña.
async function createMember(actor, { name, lastName, dni, birthDate, email, phone, existingUserId }) {
    const { clubId } = actor
    email = email || null

    const matches = await findMatchingUsers(clubId, { dni, email })
    matches.forEach(assertCanBeMember)

    let member

    if (existingUserId) {
        // El usuario indicado tiene que ser la persona que se detectó con estos mismos datos
        const user = matches.find(item => item.id === existingUserId)
        if (!user || matches.length > 1) throw createError(m.existingUserMismatch, 400)

        member = await withRetry(async (transaction) => {
            // Con el usuario bloqueado, otra alta simultánea sobre él espera y después ve el member ya creado
            const locked = await User.findByPk(user.id, { transaction, lock: transaction.LOCK.UPDATE })
            const existing = await Member.findOne({ where: { userId: locked.id }, attributes: ['numMember'], transaction })
            if (existing) throw createError(m.alreadyMember(existing.numMember), 409)

            return createMembership(locked, transaction)
        })

        await logger(actorOf(actor), LOG_ACTIONS.MEMBER_CREATED,
            `Socio Nº ${member.numMember}: ${fullNameOf(user)}, sobre su usuario existente (id ${user.id})${member.codeFamily ? ', con código de vínculo' : ''}`)

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

        if (!email && isAdult(birthDate)) throw createError(m.emailRequiredAdult, 400)

        try {
            member = await withRetry(async (transaction) => {
                // Usuario pendiente de registro: sin nombre de usuario ni contraseña hasta que se registra con su número de socio
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

                return createMembership(user, transaction)
            })

        } catch (error) {
            throw uniqueUserError(error) ?? error   // DNI o email de un usuario de otro club
        }

        await logger(actorOf(actor), LOG_ACTIONS.MEMBER_CREATED,
            `Socio Nº ${member.numMember}: ${name} ${lastName}${member.codeFamily ? ' (menor de edad, con código de vínculo)' : ''}`)
    }

    return getReceipt(actor, member.id)
}

// ---------- Modificación ----------

// Campos que el Admin puede modificar, con su nombre para la bitácora
const EDITABLE_FIELDS = {
    name: 'nombre',
    lastName: 'apellido',
    dni: 'DNI',
    birthDate: 'fecha de nacimiento',
    email: 'email',
    phone: 'teléfono',
    username: 'usuario'
}

// El email vuelve a ser obligatorio si, con la fecha nueva, es mayor. El nombre de usuario solo si ya se registró.
async function updateMember(actor, memberId, { name, lastName, dni, birthDate, email, phone, username }) {
    const member = await findClubMember(actor.clubId, memberId)
    const { user } = member
    const isRegistered = user.userStateId !== USER_STATES.PENDING

    if (username && !isRegistered) throw createError(m.usernameNotRegistered, 400)

    const wanted = {
        name,
        lastName,
        dni,
        birthDate,
        email: email || null,
        phone: phone || null,
        username: isRegistered && username ? username : user.username   // Sin usuario nuevo, queda el que tenía
    }

    if (!wanted.email && isAdult(wanted.birthDate)) throw createError(m.emailRequiredAdult, 400)

    const changes = Object.fromEntries(Object.entries(wanted).filter(([field, value]) => user[field] !== value))
    const changedFields = Object.keys(changes)

    if (changedFields.length === 0) return getMember(actor, member.id)

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

    const previousBirthDate = user.birthDate

    try {
        await user.update(changes)

    } catch (error) {
        throw uniqueUserError(error) ?? error
    }

    // El cambio de la fecha de nacimiento queda con las dos fechas, porque cambia los permisos condicionados por edad
    const details = changedFields.map(field => field === 'birthDate'
        ? `fecha de nacimiento: ${previousBirthDate} → ${changes.birthDate}`
        : EDITABLE_FIELDS[field])

    await logger(actorOf(actor), LOG_ACTIONS.MEMBER_UPDATED, `Socio Nº ${member.numMember}: ${details.join(', ')}`)

    return getMember(actor, member.id)
}

// ---------- Baja, reactivación y desbloqueo ----------

// La baja deja al socio INACTIVE sin tocar su usuario (si es Familia, sigue entrando con ese rol).
// Inscripciones, cuotas y categorías no se modifican: cada módulo consulta el estado del socio.
async function deactivateMember(actor, memberId) {
    const member = await findClubMember(actor.clubId, memberId)
    if (member.memberStateId === MEMBER_STATES.INACTIVE) throw createError(m.alreadyInactive, 409)

    await member.update({ memberStateId: MEMBER_STATES.INACTIVE })
    await logger(actorOf(actor), LOG_ACTIONS.MEMBER_DEACTIVATED, `Socio Nº ${member.numMember}: ${fullNameOf(member.user)}`)

    return getMember(actor, member.id)
}

// Solo de INACTIVE a ACTIVE. Un SUSPENDED por mora se recupera solo al pagar
async function reactivateMember(actor, memberId) {
    const member = await findClubMember(actor.clubId, memberId)

    if (member.memberStateId === MEMBER_STATES.SUSPENDED) throw createError(m.suspendedNotReactivable, 409)
    if (member.memberStateId !== MEMBER_STATES.INACTIVE) throw createError(m.notInactive, 409)

    await member.update({ memberStateId: MEMBER_STATES.ACTIVE })
    await logger(actorOf(actor), LOG_ACTIONS.MEMBER_REACTIVATED, `Socio Nº ${member.numMember}: ${fullNameOf(member.user)}`)

    return getMember(actor, member.id)
}

// Usuario BLOCKED por intentos fallidos → ACTIVE, con los intentos en 0
async function unblockMember(actor, memberId) {
    const member = await findClubMember(actor.clubId, memberId)
    const { user } = member

    if (user.userStateId !== USER_STATES.BLOCKED) throw createError(m.notBlocked, 409)

    await user.update({ userStateId: USER_STATES.ACTIVE, failedAttempts: 0 })
    await logger(actorOf(actor), LOG_ACTIONS.USER_UNBLOCKED, `Desbloqueado por el Admin: socio Nº ${member.numMember}, usuario "${user.username}" (id ${user.id})`)

    return getMember(actor, member.id)
}

module.exports = {
    generateMemberNumber,
    listMembers,
    getMember,
    getReceipt,
    createMember,
    updateMember,
    deactivateMember,
    reactivateMember,
    unblockMember
}
