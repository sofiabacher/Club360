// Service de access: roles, permisos y su asignación.
// Lógica de negocio y acceso a modelos. Filtra siempre por el clubId del usuario logueado (nunca el del body),
// registra las acciones relevantes en la bitácora (utils/logger) y lanza los errores con createError (utils/errors).
const { Op, UniqueConstraintError } = require('sequelize')

const sequelize = require('../../config/db')
const { User, Role, Member, UserRole, RolePermission, UserPermission, Permission } = require('../../models')

const logger = require('../../utils/logger')
const { createError } = require('../../utils/errors')
const { USER_STATES, MEMBER_STATES, MEMBERSHIP_ROLES, BASE_ROLES, LOG_ACTIONS } = require('../../utils/constants')
const { ADULT_ONLY_PERMISSIONS, LOCKED_ADMIN_PERMISSIONS } = require('../../utils/permissions')
const { isAdult } = require('../../utils/dates')
const { access: m } = require('../../utils/messages')

const USERS_PAGE_SIZE = 20

// Roles con los que el usuario puede trabajar: los de user_role de su club, menos los de MEMBERSHIP_ROLES (Socio y Jugadora)
// si su member está INACTIVE (baja dada por el Admin). Un socio SUSPENDED por mora los conserva.
// No es dar acceso por nombre de rol: es la disponibilidad del rol según la condición de socio (contexto, 3.6.1).
// Devuelve [{ id, name }] ordenados por id.
async function getAvailableRoles(userId) {
    const user = await User.findByPk(userId, {
        attributes: ['id', 'clubId'],
        include: [
            { model: Role, as: 'roles', attributes: ['id', 'clubId', 'name'], through: { attributes: [] } },
            { model: Member, as: 'member', attributes: ['memberStateId'] }
        ]
    })

    if (!user) return []

    const membershipLost = user.member?.memberStateId === MEMBER_STATES.INACTIVE

    return user.roles
        .filter(role => role.clubId === user.clubId)
        .filter(role => !(membershipLost && MEMBERSHIP_ROLES.includes(role.name)))
        .map(role => ({ id: role.id, name: role.name }))
        .sort((a, b) => a.id - b.id)
}

// Permisos efectivos: los del rol activo + los directos del usuario (no la suma de todos sus roles),
// menos ADULT_ONLY_PERMISSIONS si el usuario es menor de 18.
// Es la única fuente de permisos: la usan checkPermission y la sesión del front (/auth/me). Devuelve los nombres ordenados.
async function getEffectivePermissions(userId, activeRoleId) {
    if (!activeRoleId) return []

    const includePermission = { model: Permission, as: 'permission', attributes: ['name'] }

    const [user, byRole, byUser] = await Promise.all([
        User.findByPk(userId, { attributes: ['birthDate'] }),
        RolePermission.findAll({ where: { roleId: activeRoleId }, attributes: ['permissionId'], include: [includePermission] }),
        UserPermission.findAll({ where: { userId }, attributes: ['permissionId'], include: [includePermission] })
    ])

    if (!user) return []

    const names = new Set([...byRole, ...byUser].map(row => row.permission.name))

    if (!isAdult(user.birthDate)) {
        ADULT_ONLY_PERMISSIONS.forEach(name => names.delete(name))
    }

    return [...names].sort()
}

// ---------- Reglas de la gestión de roles (contexto, sección 4, "Gestión de roles y permisos") ----------

// Los roles base se identifican por su nombre (BASE_ROLES): por eso no se renombran ni se eliminan
const isAdminRole = (role) => role.isBase && role.name === BASE_ROLES.ADMIN

// A mano (pantalla "Usuarios y roles") solo se asignan los roles nuevos y "Admin del Club".
// Los demás roles base (Socio, Jugadora, Familia, Representante, Entrenadora, Preparadora física) son de circuito.
const isAssignable = (role) => !role.isBase || isAdminRole(role)

// Roles base que asignan los circuitos (alta de socio, inscripción, vínculo familiar, alta de staff)
const CIRCUIT_ROLE_NAMES = Object.values(BASE_ROLES).filter(name => name !== BASE_ROLES.ADMIN)

const actorOf = ({ id: userId, clubId, activeRoleId }) => ({ clubId, userId, roleId: activeRoleId })

// Usuario o email; si no tiene ninguno (socio menor sin registrar), el nombre
const userLabel = (user) => `"${user.username ?? user.email ?? `${user.name} ${user.lastName}`}" (id ${user.id})`

// Nombres de una lista de ids de permisos, para los detalles de la bitácora
const namesOf = (ids, permissionsById) => ids.map(id => permissionsById.get(id).name).join(', ')

// Todos los permisos del catálogo indexados por id
async function getPermissionsById(options = {}) {
    const permissions = await Permission.findAll({ attributes: ['id', 'name', 'module', 'action', 'description'], order: [['id', 'ASC']], ...options })
    return new Map(permissions.map(permission => [permission.id, permission]))
}

// Los ids pedidos tienen que existir en el catálogo
function assertPermissionsExist(permissionIds, permissionsById) {
    if (permissionIds.some(id => !permissionsById.has(id))) throw createError(m.permissionsNotFound, 400)
}

const unique = (ids) => [...new Set(ids)]

// Qué ids hay que agregar y cuáles quitar para pasar de `current` a `wanted`
function diff(current, wanted) {
    return {
        added: wanted.filter(id => !current.includes(id)),
        removed: current.filter(id => !wanted.includes(id))
    }
}

// Usuarios no DELETED que tienen cada rol: { roleId: cantidad }
async function countUsersByRole(roleIds, options = {}) {
    if (roleIds.length === 0) return {}

    const rows = await UserRole.findAll({
        where: { roleId: roleIds },
        attributes: ['roleId', [sequelize.fn('COUNT', sequelize.col('UserRole.userId')), 'total']],
        include: [{ model: User, as: 'user', attributes: [], where: { userStateId: { [Op.ne]: USER_STATES.DELETED } } }],
        group: ['UserRole.roleId'],
        raw: true,
        ...options
    })

    return Object.fromEntries(rows.map(row => [row.roleId, Number(row.total)]))
}

// ---------- Permisos ----------

// Catálogo agrupado por módulo, en el orden del catálogo: [{ module, permissions: [{ id, name, action, description }] }]
async function listPermissions() {
    const permissions = await getPermissionsById()
    const groups = new Map()

    for (const { id, name, module, action, description } of permissions.values()) {
        if (!groups.has(module)) groups.set(module, [])
        groups.get(module).push({ id, name, action, description })
    }

    return [...groups].map(([module, items]) => ({ module, permissions: items }))
}

// ---------- Roles ----------

async function findClubRole(clubId, roleId, options = {}) {
    const role = await Role.findOne({ where: { id: roleId, clubId }, ...options })
    if (!role) throw createError(m.roleNotFound, 404)
    return role
}

async function getRolePermissionIds(roleId, options = {}) {
    const rows = await RolePermission.findAll({ where: { roleId }, attributes: ['permissionId'], raw: true, ...options })
    return rows.map(row => row.permissionId).sort((a, b) => a - b)
}

// Ids de LOCKED_ADMIN_PERMISSIONS si el rol es "Admin del Club"; si no, []
async function getLockedPermissionIds(role, options = {}) {
    if (!isAdminRole(role)) return []

    const rows = await Permission.findAll({ where: { name: LOCKED_ADMIN_PERMISSIONS }, attributes: ['id'], raw: true, ...options })
    return rows.map(row => row.id).sort((a, b) => a - b)
}

// Roles del club: primero los base y después los nuevos, cada grupo por nombre
async function listRoles({ clubId }) {
    const roles = await Role.findAll({
        where: { clubId },
        attributes: ['id', 'name', 'description', 'isBase'],
        order: [['isBase', 'DESC'], ['name', 'ASC']]
    })

    const roleIds = roles.map(role => role.id)
    const [permissionRows, userCounts] = await Promise.all([
        RolePermission.findAll({
            where: { roleId: roleIds },
            attributes: ['roleId', [sequelize.fn('COUNT', sequelize.col('permissionId')), 'total']],
            group: ['roleId'],
            raw: true
        }),
        countUsersByRole(roleIds)
    ])

    const permissionCounts = Object.fromEntries(permissionRows.map(row => [row.roleId, Number(row.total)]))

    return roles.map(role => ({
        id: role.id,
        name: role.name,
        description: role.description,
        isBase: role.isBase,
        permissionCount: permissionCounts[role.id] ?? 0,
        userCount: userCounts[role.id] ?? 0,
        editableName: !role.isBase
    }))
}

async function getRole({ clubId }, roleId) {
    const role = await findClubRole(clubId, roleId)

    const [permissionIds, lockedPermissions, userCounts] = await Promise.all([
        getRolePermissionIds(role.id),
        getLockedPermissionIds(role),
        countUsersByRole([role.id])
    ])

    return {
        id: role.id,
        name: role.name,
        description: role.description,
        isBase: role.isBase,
        editableName: !role.isBase,
        userCount: userCounts[role.id] ?? 0,
        permissionIds,
        lockedPermissions
    }
}

// El nombre no se puede repetir dentro del club (índice único (clubId, name))
async function assertRoleNameFree(clubId, name, exceptRoleId, options = {}) {
    const where = { clubId, name, ...(exceptRoleId && { id: { [Op.ne]: exceptRoleId } }) }
    const taken = await Role.findOne({ where, attributes: ['id'], ...options })
    if (taken) throw createError(m.roleNameTaken, 409)
}

// Si dos pedidos crean el mismo nombre a la vez, el índice único corta al segundo
async function withUniqueName(task) {
    try {
        return await task()
    } catch (error) {
        if (error instanceof UniqueConstraintError) throw createError(m.roleNameTaken, 409)
        throw error
    }
}

async function createRole(actor, { name, description, permissionIds }) {
    const { clubId } = actor
    const wanted = unique(permissionIds)
    const permissionsById = await getPermissionsById()

    assertPermissionsExist(wanted, permissionsById)
    await assertRoleNameFree(clubId, name)

    const role = await withUniqueName(() => sequelize.transaction(async (transaction) => {
        const created = await Role.create({ clubId, name, description: description || null, isBase: false }, { transaction })

        for (const permissionId of wanted) {
            await RolePermission.create({ roleId: created.id, permissionId }, { transaction })
        }

        return created
    }))

    await logger(actorOf(actor), LOG_ACTIONS.ROLE_CREATED,
        `Rol "${role.name}" (id ${role.id}) con ${wanted.length} permisos: ${namesOf(wanted, permissionsById) || 'ninguno'}`)

    return getRole(actor, role.id)
}

// Reemplaza los permisos del rol: agrega los que faltan y quita los que sobran.
// En un rol base se ignora el nombre; "Admin del Club" tiene que conservar LOCKED_ADMIN_PERMISSIONS.
async function updateRole(actor, roleId, { name, description, permissionIds }) {
    const { clubId } = actor
    const wanted = unique(permissionIds)
    const permissionsById = await getPermissionsById()

    assertPermissionsExist(wanted, permissionsById)

    const changes = await withUniqueName(() => sequelize.transaction(async (transaction) => {
        const role = await findClubRole(clubId, roleId, { transaction, lock: transaction.LOCK.UPDATE })

        const lockedIds = await getLockedPermissionIds(role, { transaction })
        if (lockedIds.some(id => !wanted.includes(id))) throw createError(m.adminLockedPermissions, 400)

        const newName = role.isBase || name === undefined ? role.name : name
        if (newName !== role.name) await assertRoleNameFree(clubId, newName, role.id, { transaction })

        const current = await getRolePermissionIds(role.id, { transaction })
        const { added, removed } = diff(current, wanted)

        for (const permissionId of added) {
            await RolePermission.create({ roleId: role.id, permissionId }, { transaction })
        }

        if (removed.length > 0) {
            await RolePermission.destroy({ where: { roleId: role.id, permissionId: removed }, transaction })
        }

        const fields = { name: newName, description: description === undefined ? role.description : (description || null) }
        const changedFields = Object.keys(fields).filter(field => role[field] !== fields[field])
        const oldName = role.name

        if (changedFields.length > 0) await role.update(fields, { transaction })

        return { role, oldName, added, removed, changedFields }
    }))

    const { role, oldName, added, removed, changedFields } = changes

    if (added.length > 0 || removed.length > 0 || changedFields.length > 0) {
        const details = [
            `Rol "${role.name}" (id ${role.id})`,
            changedFields.includes('name') && `nombre: "${oldName}" → "${role.name}"`,
            changedFields.includes('description') && 'descripción modificada',
            `permisos agregados: ${namesOf(added, permissionsById) || 'ninguno'}`,
            `permisos quitados: ${namesOf(removed, permissionsById) || 'ninguno'}`
        ].filter(Boolean).join('. ')

        await logger(actorOf(actor), LOG_ACTIONS.ROLE_UPDATED, details)
    }

    return getRole(actor, role.id)
}

// Solo roles nuevos y sin usuarios. Se borran también sus permisos (role_permission)
async function deleteRole(actor, roleId) {
    const { clubId } = actor

    const role = await sequelize.transaction(async (transaction) => {
        const role = await findClubRole(clubId, roleId, { transaction, lock: transaction.LOCK.UPDATE })
        if (role.isBase) throw createError(m.baseRoleNotDeletable, 403)

        const userCount = (await countUsersByRole([role.id], { transaction }))[role.id] ?? 0
        if (userCount > 0) throw createError(m.roleHasUsers(userCount), 409)

        // Con destroy de Sequelize (y no el borrado en cascada de la base) para que los hooks recalculen el DVV.
        // Los user_role que quedan son solo de usuarios dados de baja (DELETED), que ya no cuentan.
        await RolePermission.destroy({ where: { roleId: role.id }, transaction })
        await UserRole.destroy({ where: { roleId: role.id }, transaction })
        await role.destroy({ transaction })

        return role
    })

    await logger(actorOf(actor), LOG_ACTIONS.ROLE_DELETED, `Rol "${role.name}" (id ${role.id})`)
}

// ---------- Usuarios: roles y permisos directos ----------

async function findClubUser(clubId, userId, options = {}) {
    const user = await User.findOne({
        where: { id: userId, clubId, userStateId: { [Op.ne]: USER_STATES.DELETED } },
        attributes: ['id', 'name', 'lastName', 'username', 'email', 'userStateId', 'birthDate'],
        ...options
    })

    if (!user) throw createError(m.userNotFound, 404)
    return user
}

const roleSummary = (role) => ({ id: role.id, name: role.name, isBase: role.isBase })

// Usuarios del club que no están DELETED, de a USERS_PAGE_SIZE. Cada palabra de la búsqueda tiene que aparecer
// en el nombre, el apellido, el usuario o el email (así "ana pérez" encuentra a Ana Pérez).
async function listUsers({ clubId }, { search = '', page = 1 }) {
    page = Number(page) || 1   // Con Express 5 req.query es de solo lectura: el toInt del validator no llega hasta acá
    const words = search.trim().split(/\s+/).filter(Boolean)
    const fields = ['name', 'lastName', 'username', 'email']

    const where = {
        clubId,
        userStateId: { [Op.ne]: USER_STATES.DELETED },
        ...(words.length > 0 && {
            [Op.and]: words.map(word => ({ [Op.or]: fields.map(field => ({ [field]: { [Op.like]: `%${word}%` } })) }))
        })
    }

    const { count, rows } = await User.findAndCountAll({
        where,
        attributes: ['id', 'name', 'lastName', 'username', 'email', 'userStateId'],
        order: [['lastName', 'ASC'], ['name', 'ASC'], ['id', 'ASC']],
        limit: USERS_PAGE_SIZE,
        offset: (page - 1) * USERS_PAGE_SIZE
    })

    // Los roles van en una segunda consulta para que el include no altere el conteo ni la paginación
    const userRoles = await UserRole.findAll({
        where: { userId: rows.map(user => user.id) },
        include: [{ model: Role, as: 'role', attributes: ['id', 'name', 'isBase'], where: { clubId } }],
        order: [[{ model: Role, as: 'role' }, 'isBase', 'DESC'], [{ model: Role, as: 'role' }, 'name', 'ASC']]
    })

    return {
        items: rows.map(user => ({
            id: user.id,
            fullName: `${user.name} ${user.lastName}`,
            username: user.username,
            email: user.email,
            userStateId: user.userStateId,
            roles: userRoles.filter(row => row.userId === user.id).map(row => roleSummary(row.role))
        })),
        total: count,
        page,
        pageSize: USERS_PAGE_SIZE,
        totalPages: Math.max(1, Math.ceil(count / USERS_PAGE_SIZE))
    }
}

async function getUser({ clubId }, userId) {
    const user = await findClubUser(clubId, userId)

    const [clubRoles, userRoles, directRows, adultOnly] = await Promise.all([
        Role.findAll({ where: { clubId }, attributes: ['id', 'name', 'description', 'isBase'], order: [['isBase', 'DESC'], ['name', 'ASC']] }),
        UserRole.findAll({ where: { userId: user.id }, attributes: ['roleId'], raw: true }),
        UserPermission.findAll({ where: { userId: user.id }, attributes: ['permissionId'], raw: true }),
        Permission.findAll({ where: { name: ADULT_ONLY_PERMISSIONS }, attributes: ['id'], raw: true })
    ])

    const userRoleIds = userRoles.map(row => row.roleId)
    const roles = clubRoles.filter(role => userRoleIds.includes(role.id))
    const assignableRoles = clubRoles.filter(isAssignable)

    // Los permisos de cada rol del usuario, para avisar en el front cuáles ya tiene por un rol
    const rolePermissionRows = await RolePermission.findAll({ where: { roleId: roles.map(role => role.id) }, attributes: ['roleId', 'permissionId'], raw: true })
    const adult = isAdult(user.birthDate)

    return {
        id: user.id,
        name: user.name,
        lastName: user.lastName,
        fullName: `${user.name} ${user.lastName}`,
        username: user.username,
        email: user.email,
        userStateId: user.userStateId,
        isAdult: adult,
        roles: roles.map(role => ({
            ...roleSummary(role),
            assignable: isAssignable(role),
            permissionIds: rolePermissionRows.filter(row => row.roleId === role.id).map(row => row.permissionId).sort((a, b) => a - b)
        })),
        assignableRoleIds: assignableRoles.map(role => role.id),
        assignableRoles: assignableRoles.map(role => ({ ...roleSummary(role), description: role.description })),
        permissionIds: directRows.map(row => row.permissionId).sort((a, b) => a - b),
        // Permisos que no le aplican aunque se le asignen, porque es menor de edad (ADULT_ONLY_PERMISSIONS)
        restrictedPermissionIds: adult ? [] : adultOnly.map(row => row.id)
    }
}

// Reemplaza los roles asignables del usuario (roles nuevos y "Admin del Club") por roleIds.
// Los roles de circuito que ya tiene no se tocan.
async function updateUserRoles(actor, userId, { roleIds }) {
    const { clubId } = actor
    const wanted = unique(roleIds)

    const result = await sequelize.transaction(async (transaction) => {
        const user = await findClubUser(clubId, userId, { transaction })

        const requested = await Role.findAll({ where: { id: wanted, clubId }, transaction })
        if (requested.length !== wanted.length) throw createError(m.rolesNotFound, 400)
        if (requested.some(role => !isAssignable(role))) throw createError(m.circuitRole, 403)

        const currentRows = await UserRole.findAll({
            where: { userId: user.id },
            include: [{ model: Role, as: 'role', where: { clubId } }],
            transaction
        })

        const currentAssignable = currentRows.map(row => row.role).filter(isAssignable)
        const { added, removed } = diff(currentAssignable.map(role => role.id), wanted)
        const rolesById = new Map([...requested, ...currentAssignable].map(role => [role.id, role]))

        const adminRole = [...rolesById.values()].find(isAdminRole)
        if (adminRole && removed.includes(adminRole.id)) {
            if (user.id === actor.id) throw createError(m.selfAdminRemoval, 403)
        }

        // Si el usuario es un Admin ACTIVE, tiene que quedar otro: siempre hay al menos un Admin activo en el club
        if (adminRole && removed.includes(adminRole.id) && user.userStateId === USER_STATES.ACTIVE) {

            // Se bloquea el rol para que dos quitas simultáneas no dejen al club sin Admin activo
            await Role.findByPk(adminRole.id, { transaction, lock: transaction.LOCK.UPDATE })

            const otherActiveAdmins = await UserRole.count({
                where: { roleId: adminRole.id, userId: { [Op.ne]: user.id } },
                include: [{ model: User, as: 'user', where: { userStateId: USER_STATES.ACTIVE } }],
                transaction
            })

            if (otherActiveAdmins === 0) throw createError(m.lastAdmin, 409)
        }

        for (const roleId of added) {
            await UserRole.create({ userId: user.id, roleId }, { transaction })
        }

        if (removed.length > 0) {
            await UserRole.destroy({ where: { userId: user.id, roleId: removed }, transaction })
        }

        return { user, added, removed, rolesById }
    })

    const { user, added, removed, rolesById } = result

    for (const roleId of added) {
        await logger(actorOf(actor), LOG_ACTIONS.ROLE_ASSIGNED, `Usuario ${userLabel(user)}: rol "${rolesById.get(roleId).name}" (id ${roleId})`)
    }

    for (const roleId of removed) {
        await logger(actorOf(actor), LOG_ACTIONS.ROLE_REMOVED, `Usuario ${userLabel(user)}: rol "${rolesById.get(roleId).name}" (id ${roleId})`)
    }

    return getUser(actor, user.id)
}

// Reemplaza los permisos directos del usuario (user_permission)
async function updateUserPermissions(actor, userId, { permissionIds }) {
    const { clubId } = actor
    const wanted = unique(permissionIds)
    const permissionsById = await getPermissionsById()

    assertPermissionsExist(wanted, permissionsById)

    const result = await sequelize.transaction(async (transaction) => {
        const user = await findClubUser(clubId, userId, { transaction })

        const currentRows = await UserPermission.findAll({ where: { userId: user.id }, attributes: ['permissionId'], raw: true, transaction })
        const { added, removed } = diff(currentRows.map(row => row.permissionId), wanted)

        for (const permissionId of added) {
            await UserPermission.create({ userId: user.id, permissionId }, { transaction })
        }

        if (removed.length > 0) {
            await UserPermission.destroy({ where: { userId: user.id, permissionId: removed }, transaction })
        }

        return { user, added, removed }
    })

    const { user, added, removed } = result

    for (const permissionId of added) {
        await logger(actorOf(actor), LOG_ACTIONS.PERMISSION_ASSIGNED, `Usuario ${userLabel(user)}: permiso ${permissionsById.get(permissionId).name}`)
    }

    for (const permissionId of removed) {
        await logger(actorOf(actor), LOG_ACTIONS.PERMISSION_REMOVED, `Usuario ${userLabel(user)}: permiso ${permissionsById.get(permissionId).name}`)
    }

    return getUser(actor, user.id)
}

// ---------- Helpers para los circuitos (Fase 3 y 4) ----------
// Los usan el alta de socio, la aprobación de la inscripción, el vínculo familiar y el alta de staff para dar o quitar
// su rol base, en lugar de escribir user_role por su cuenta. No pasan por las reglas de la asignación manual, pero
// no permiten tocar "Admin del Club". La bitácora la registra el módulo que los llama, que conoce la acción.

async function findCircuitRole(userId, roleName, transaction) {
    if (!CIRCUIT_ROLE_NAMES.includes(roleName)) throw createError(m.notCircuitRole, 400)

    const user = await User.findByPk(userId, { attributes: ['id', 'clubId'], transaction })
    if (!user) throw createError(m.userNotFound, 404)

    const role = await Role.findOne({ where: { clubId: user.clubId, name: roleName, isBase: true }, transaction })
    if (!role) throw createError(m.roleNotFound, 404)

    return { user, role }
}

// Asigna el rol base roleName (de BASE_ROLES) en el club del usuario. Si ya lo tenía, no hace nada.
// Devuelve true si lo asignó.
async function assignBaseRole(userId, roleName, { transaction } = {}) {
    const { user, role } = await findCircuitRole(userId, roleName, transaction)
    const [, created] = await UserRole.findOrCreate({ where: { userId: user.id, roleId: role.id }, transaction })
    return created
}

// Quita el rol base roleName (de BASE_ROLES). Devuelve true si lo tenía.
async function removeBaseRole(userId, roleName, { transaction } = {}) {
    const { user, role } = await findCircuitRole(userId, roleName, transaction)
    const removed = await UserRole.destroy({ where: { userId: user.id, roleId: role.id }, transaction })
    return removed > 0
}

module.exports = {
    getAvailableRoles,
    getEffectivePermissions,
    listPermissions,
    listRoles,
    getRole,
    createRole,
    updateRole,
    deleteRole,
    listUsers,
    getUser,
    updateUserRoles,
    updateUserPermissions,
    assignBaseRole,
    removeBaseRole
}
