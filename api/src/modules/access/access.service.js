// Service de access: roles, permisos y su asignación.
// Lógica de negocio y acceso a modelos. Filtra siempre por el clubId del usuario logueado (nunca el del body),
// registra las acciones relevantes en la bitácora (utils/logger) y lanza los errores con createError (utils/errors).
const { User, Role, Member, RolePermission, UserPermission, Permission } = require('../../models')

const { MEMBER_STATES, MEMBERSHIP_ROLES } = require('../../utils/constants')
const { ADULT_ONLY_PERMISSIONS } = require('../../utils/permissions')
const { isAdult } = require('../../utils/dates')

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

module.exports = {
    getAvailableRoles,
    getEffectivePermissions
}
