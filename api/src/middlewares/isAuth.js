const { verifySessionToken } = require('../utils/token')
const { createError } = require('../utils/errors')
const { USER_STATES } = require('../utils/constants')
const { auth } = require('../utils/messages')

module.exports = async (req, res, next) => {
    try {
        const { User } = require('../models')   // Se requiere acá adentro porque los modelos todavía no existen

        const header = req.headers.authorization || ''
        const [scheme, token] = header.split(' ')

        if (scheme !== 'Bearer' || !token) {
            throw createError(auth.tokenRequired, 401)
        }

        const { valid, payload } = verifySessionToken(token)
        if (!valid) {
            throw createError(auth.invalidToken, 401)
        }

        const user = await User.findByPk(payload.id, { attributes: ['id', 'clubId', 'userStateId'] })
        if (!user) {
            throw createError(auth.userNotFound, 401)
        }

        if (user.userStateId === USER_STATES.DELETED) {
            throw createError(auth.userDeleted, 423, 'USER_DELETED')
        }

        if (user.userStateId !== USER_STATES.ACTIVE) {
            throw createError(auth.inactiveUser, 401)
        }

        req.user = { id: user.id, clubId: user.clubId, activeRoleId: payload.activeRoleId }
        next()

    } catch (error) {
        next(error)
    }
}
