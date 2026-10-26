// Controller de staff.
// Lee req (params, query, body, user), llama al service y responde { success: true, data } o { success: false, message }.
// Sin lógica de negocio ni acceso a modelos. Los errores se pasan con next(error).
const service = require('./staff.service')

const list = async (req, res, next) => {
    try {
        const { search, role, state, page } = req.query
        const data = await service.listStaff(req.user, { search, role, state, page })
        res.json({ success: true, data })

    } catch (error) {
        next(error)
    }
}

const getOptions = async (req, res, next) => {
    try {
        const data = await service.getOptions(req.user)
        res.json({ success: true, data })

    } catch (error) {
        next(error)
    }
}

const getById = async (req, res, next) => {
    try {
        const data = await service.getStaff(req.user, req.params.id)
        res.json({ success: true, data })

    } catch (error) {
        next(error)
    }
}

const create = async (req, res, next) => {
    try {
        const { name, lastName, dni, birthDate, email, phone, roles, clubSportId, existingUserId } = req.body
        const data = await service.createStaff(req.user, { name, lastName, dni, birthDate, email, phone, roles, clubSportId, existingUserId })
        res.status(201).json({ success: true, data })

    } catch (error) {
        next(error)
    }
}

const update = async (req, res, next) => {
    try {
        const { name, lastName, dni, birthDate, email, phone, username, roles, clubSportId } = req.body
        const data = await service.updateStaff(req.user, req.params.id, { name, lastName, dni, birthDate, email, phone, username, roles, clubSportId })
        res.json({ success: true, data })

    } catch (error) {
        next(error)
    }
}

const deactivate = async (req, res, next) => {
    try {
        const data = await service.deactivateStaff(req.user, req.params.id)
        res.json({ success: true, data })

    } catch (error) {
        next(error)
    }
}

const reactivate = async (req, res, next) => {
    try {
        const data = await service.reactivateStaff(req.user, req.params.id, { roles: req.body.roles })
        res.json({ success: true, data })

    } catch (error) {
        next(error)
    }
}

const unblock = async (req, res, next) => {
    try {
        const data = await service.unblockStaff(req.user, req.params.id)
        res.json({ success: true, data })

    } catch (error) {
        next(error)
    }
}

const resendActivation = async (req, res, next) => {
    try {
        const data = await service.resendActivation(req.user, req.params.id)
        res.json({ success: true, data })

    } catch (error) {
        next(error)
    }
}

module.exports = {
    list,
    getOptions,
    getById,
    create,
    update,
    deactivate,
    reactivate,
    unblock,
    resendActivation
}
