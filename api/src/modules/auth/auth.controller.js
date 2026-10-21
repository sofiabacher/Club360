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

const forgotPassword = async (req, res, next) => {
    try {
        const data = await service.forgotPassword(req.body.identifier)
        res.json({ success: true, data })

    } catch (error) {
        next(error)
    }
}

const validateResetToken = async (req, res, next) => {
    try {
        const data = await service.validateResetToken(req.query.token)
        res.json({ success: true, data })

    } catch (error) {
        next(error)
    }
}

const resetPassword = async (req, res, next) => {
    try {
        const { token, password } = req.body
        const data = await service.resetPassword({ token, password })
        res.json({ success: true, data })

    } catch (error) {
        next(error)
    }
}

const getAccount = async (req, res, next) => {
    try {
        const data = await service.getAccount(req.user.id)
        res.json({ success: true, data })

    } catch (error) {
        next(error)
    }
}

const updateAccount = async (req, res, next) => {
    try {
        const { email, phone } = req.body   // Solo estos dos: el resto del body se ignora
        const data = await service.updateAccount(req.user, { email, phone })
        res.json({ success: true, data })

    } catch (error) {
        next(error)
    }
}

const updatePhoto = async (req, res, next) => {
    try {
        const data = await service.updatePhoto(req.user, req.file)
        res.json({ success: true, data })

    } catch (error) {
        next(error)
    }
}

const changePassword = async (req, res, next) => {
    try {
        const { currentPassword, newPassword } = req.body
        await service.changePassword(req.user, { currentPassword, newPassword })
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
    logout,
    forgotPassword,
    validateResetToken,
    resetPassword,
    getAccount,
    updateAccount,
    updatePhoto,
    changePassword
}
