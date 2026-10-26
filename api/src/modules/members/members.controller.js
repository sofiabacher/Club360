// Controller de members.
// Lee req (params, query, body, user), llama al service y responde { success: true, data } o { success: false, message }.
// Sin lógica de negocio ni acceso a modelos. Los errores se pasan con next(error).
const service = require('./members.service')

const list = async (req, res, next) => {
    try {
        const { search, state, registration, page } = req.query
        const data = await service.listMembers(req.user, { search, state, registration, page })
        res.json({ success: true, data })

    } catch (error) {
        next(error)
    }
}

const getById = async (req, res, next) => {
    try {
        const data = await service.getMember(req.user, req.params.id)
        res.json({ success: true, data })

    } catch (error) {
        next(error)
    }
}

const getReceipt = async (req, res, next) => {
    try {
        const data = await service.getReceipt(req.user, req.params.id)
        res.json({ success: true, data })

    } catch (error) {
        next(error)
    }
}

const create = async (req, res, next) => {
    try {
        const { name, lastName, dni, birthDate, email, phone, existingUserId } = req.body
        const data = await service.createMember(req.user, { name, lastName, dni, birthDate, email, phone, existingUserId })
        res.status(201).json({ success: true, data })

    } catch (error) {
        next(error)
    }
}

const update = async (req, res, next) => {
    try {
        const { name, lastName, dni, birthDate, email, phone, username } = req.body
        const data = await service.updateMember(req.user, req.params.id, { name, lastName, dni, birthDate, email, phone, username })
        res.json({ success: true, data })

    } catch (error) {
        next(error)
    }
}

const deactivate = async (req, res, next) => {
    try {
        const data = await service.deactivateMember(req.user, req.params.id)
        res.json({ success: true, data })

    } catch (error) {
        next(error)
    }
}

const reactivate = async (req, res, next) => {
    try {
        const data = await service.reactivateMember(req.user, req.params.id)
        res.json({ success: true, data })

    } catch (error) {
        next(error)
    }
}

const unblock = async (req, res, next) => {
    try {
        const data = await service.unblockMember(req.user, req.params.id)
        res.json({ success: true, data })

    } catch (error) {
        next(error)
    }
}

// ---------- Vínculo familiar ----------

const validateFamilyCode = async (req, res, next) => {
    try {
        const data = await service.validateFamilyCode(req.body.code)
        res.json({ success: true, data })

    } catch (error) {
        next(error)
    }
}

const linkWithNewAccount = async (req, res, next) => {
    try {
        const { code, name, lastName, dni, birthDate, email, phone, username, password } = req.body
        const data = await service.linkWithNewAccount({ code, name, lastName, dni, birthDate, email, phone, username, password })
        res.status(201).json({ success: true, data })

    } catch (error) {
        next(error)
    }
}

const linkWithExistingAccount = async (req, res, next) => {
    try {
        const { code, username, password } = req.body
        const data = await service.linkWithExistingAccount({ code, username, password })
        res.json({ success: true, data })

    } catch (error) {
        next(error)
    }
}

const linkFromAccount = async (req, res, next) => {
    try {
        const data = await service.linkFromAccount(req.user, { code: req.body.code })
        res.json({ success: true, data })

    } catch (error) {
        next(error)
    }
}

module.exports = {
    list,
    getById,
    getReceipt,
    create,
    update,
    deactivate,
    reactivate,
    unblock,
    validateFamilyCode,
    linkWithNewAccount,
    linkWithExistingAccount,
    linkFromAccount
}
