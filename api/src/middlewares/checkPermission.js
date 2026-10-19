const logger = require('../utils/logger')
const { getEffectivePermissions } = require('../modules/access/access.service')
const { createError } = require('../utils/errors')
const { LOG_ACTIONS } = require('../utils/constants')
const { auth } = require('../utils/messages')

// Uso: checkPermission(PERMISSIONS.FEES_MANAGE). Va siempre después de isAuth.
// Los permisos salen de getEffectivePermissions, la misma función que arma la sesión del front (/auth/me).
const checkPermission = (permissionName) => async (req, res, next) => {
    try {
        const { id: userId, clubId, activeRoleId } = req.user

        // Con más de un rol, hasta que no elige uno solo puede usar /auth/me, /auth/switch-role y /auth/logout
        if (!activeRoleId) {
            throw createError(auth.roleSelectionRequired, 403, 'ROLE_SELECTION_REQUIRED')
        }

        const permissions = await getEffectivePermissions(userId, activeRoleId)
        if (permissions.includes(permissionName)) return next()

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
