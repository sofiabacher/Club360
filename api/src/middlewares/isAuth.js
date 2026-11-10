const { User } = require('../models')
const { getAvailableRoles } = require('../modules/access/access.service')
const { assertRequestAllowed } = require('../modules/integrity/integrity.service')
const { verifySessionToken } = require('../utils/token')
const { createError } = require('../utils/errors')
const { USER_STATES } = require('../utils/constants')
const { isAdult } = require('../utils/dates')
const { auth } = require('../utils/messages')

module.exports = async (req, res, next) => {
    try {
        const header = req.headers.authorization || ''
        const [scheme, token] = header.split(' ')

        if (scheme !== 'Bearer' || !token) {
            throw createError(auth.tokenRequired, 401)
        }

        const { valid, payload } = verifySessionToken(token)
        if (!valid) {
            throw createError(auth.invalidToken, 401)
        }

        const user = await User.findByPk(payload.id, { attributes: ['id', 'clubId', 'userStateId', 'birthDate'] })
        if (!user) {
            throw createError(auth.userNotFound, 401)
        }

        if (user.userStateId === USER_STATES.DELETED) {
            throw createError(auth.userDeleted, 423, 'USER_DELETED')
        }

        if (user.userStateId !== USER_STATES.ACTIVE) {
            throw createError(auth.inactiveUser, 401)
        }

        // El rol activo del token tiene que seguir disponible: si el Admin se lo sacó o dio de baja al socio, la sesión ya no vale
        const activeRoleId = payload.activeRoleId ?? null

        if (activeRoleId !== null) {
            const roles = await getAvailableRoles(user.id)

            if (!roles.some(role => role.id === activeRoleId)) {
                throw createError(auth.sessionNoLongerValid, 401)
            }
        }

        req.user = { id: user.id, clubId: user.clubId, activeRoleId, isAdult: isAdult(user.birthDate) }

        // Club bloqueado por integridad: solo sigue quien tiene integrity.manage o backup.manage (503 INTEGRITY_LOCK).
        // Los permisos que se calculan acá quedan en req.permissions para que checkPermission no los repita
        const permissions = await assertRequestAllowed(req.user, req.originalUrl)
        if (permissions) req.permissions = permissions

        next()

    } catch (error) {
        next(error)
    }
}
