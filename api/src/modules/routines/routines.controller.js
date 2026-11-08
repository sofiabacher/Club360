// Controller de routines.
// Lee req (params, query, body, user), llama al service y responde { success: true, data } o { success: false, message }.
// Sin lógica de negocio ni acceso a modelos. Los errores se pasan con next(error).
const service = require('./routines.service')

const categories = async (req, res, next) => {
    try {
        const data = await service.listCategories(req.user)
        res.json({ success: true, data })

    } catch (error) {
        next(error)
    }
}

const week = async (req, res, next) => {
    try {
        const data = await service.getWeek(req.user, { categoryId: req.query.categoryId, weekStart: req.query.weekStart || undefined })
        res.json({ success: true, data })

    } catch (error) {
        next(error)
    }
}

const weeks = async (req, res, next) => {
    try {
        const data = await service.listWeeks(req.user, { categoryId: req.query.categoryId })
        res.json({ success: true, data })

    } catch (error) {
        next(error)
    }
}

// La imagen (opcional) llega en req.file (middleware upload, campo image)
const create = async (req, res, next) => {
    try {
        const { categoryId, weekStart, dayOfWeek, title, description, videoUrl } = req.body
        const data = await service.createRoutine(req.user, { categoryId, weekStart, dayOfWeek, title, description, videoUrl }, req.file)
        res.status(201).json({ success: true, data })

    } catch (error) {
        next(error)
    }
}

const update = async (req, res, next) => {
    try {
        const { title, description, videoUrl, removeImage } = req.body
        const data = await service.updateRoutine(req.user, req.params.id, { title, description, videoUrl, removeImage: removeImage === true }, req.file)
        res.json({ success: true, data })

    } catch (error) {
        next(error)
    }
}

const remove = async (req, res, next) => {
    try {
        const data = await service.deleteRoutine(req.user, req.params.id)
        res.json({ success: true, data })

    } catch (error) {
        next(error)
    }
}

const mine = async (req, res, next) => {
    try {
        const data = await service.getMine(req.user, { weekStart: req.query.weekStart || undefined })
        res.json({ success: true, data })

    } catch (error) {
        next(error)
    }
}

module.exports = {
    categories,
    week,
    weeks,
    create,
    update,
    remove,
    mine
}
