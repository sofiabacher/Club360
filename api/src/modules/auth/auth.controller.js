// Controller de auth.
// Lee req (params, query, body, user), llama al service y responde { success: true, data } o { success: false, message }.
// Sin lógica de negocio ni acceso a modelos. Los errores se pasan con next(error).
const service = require('./auth.service')

const login = async (req, res, next) => {
    try {
        const { username, password } = req.body
        const data = await service.login({ username, password })
        res.json({ success: true, data })

    } catch (error) {
        next(error)
    }
}

const registerMember = async (req, res, next) => {
    try {
        const { numMember, birthDate, username, password } = req.body
        const data = await service.registerMember({ numMember, birthDate, username, password })
        res.json({ success: true, data })

    } catch (error) {
        next(error)
    }
}

const switchRole = async (req, res, next) => {
    try {
        const data = await service.switchRole(req.user, req.body.roleId)
        res.json({ success: true, data })

    } catch (error) {
        next(error)
    }
}

const me = async (req, res, next) => {
    try {
        const data = await service.getMe(req.user)
        res.json({ success: true, data })

    } catch (error) {
        next(error)
    }
}

const logout = async (req, res, next) => {
    try {
        await service.logout(req.user)
        res.json({ success: true, data: null })

    } catch (error) {
        next(error)
    }
}

module.exports = {
    login,
    registerMember,
    switchRole,
    me,
    logout
}
