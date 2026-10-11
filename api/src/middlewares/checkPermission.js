const logger = require('../utils/logger')
const { createError } = require('../utils/errors')
const { LOG_ACTIONS } = require('../utils/constants')
const { auth } = require('../utils/messages')

// Uso: checkPermission('fees.manage'). Va siempre después de isAuth.
// Permisos efectivos = los del rol activo + los directos del usuario. No se suman los de sus otros roles.
const checkPermission = (permissionName) => async (req, res, next) => {
    try {
        const { Permission, RolePermission, UserPermission } = require('../models')   // Se requieren acá adentro porque los modelos todavía no existen
        const { id: userId, clubId, activeRoleId } = req.user

        const permission = await Permission.findOne({ where: { name: permissionName }, attributes: ['id'] })

        if (permission) {
            const [byRole, byUser] = await Promise.all([
                RolePermission.findOne({ where: { roleId: activeRoleId, permissionId: permission.id } }),
                UserPermission.findOne({ where: { userId, permissionId: permission.id } })
            ])

            if (byRole || byUser) return next()
        }

        await logger(
            { clubId, userId, roleId: activeRoleId },
            LOG_ACTIONS.ACCESS_DENIED,
            `Permiso requerido: ${permissionName} (${req.method} ${req.originalUrl})`
        )

        throw createError(auth.accessDenied, 403)

    } catch (error) {
        next(error)
    }
}

module.exports = checkPermission
