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

// ---------- Seguimiento personal (P20) ----------

const saveLog = async (req, res, next) => {
    try {
        const { status, effort, note } = req.body
        const data = await service.saveLog(req.user, req.params.id, { status, effort, note })
        res.json({ success: true, data })

    } catch (error) {
        next(error)
    }
}

const myProgress = async (req, res, next) => {
    try {
        const data = await service.getMyProgress(req.user, { weeks: req.query.weeks })
        res.json({ success: true, data })

    } catch (error) {
        next(error)
    }
}

const myGoals = async (req, res, next) => {
    try {
        const data = await service.listMyGoals(req.user, { state: req.query.state })
        res.json({ success: true, data })

    } catch (error) {
        next(error)
    }
}

const createGoal = async (req, res, next) => {
    try {
        const { text, dueDate } = req.body
        const data = await service.createGoal(req.user, { text, dueDate })
        res.status(201).json({ success: true, data })

    } catch (error) {
        next(error)
    }
}

const updateGoal = async (req, res, next) => {
    try {
        const { text, dueDate } = req.body
        const data = await service.updateGoal(req.user, req.params.id, { text, dueDate })
        res.json({ success: true, data })

    } catch (error) {
        next(error)
    }
}

const setGoalState = async (req, res, next) => {
    try {
        const { goalState, dueDate } = req.body
        const data = await service.setGoalState(req.user, req.params.id, { goalState, dueDate })
        res.json({ success: true, data })

    } catch (error) {
        next(error)
    }
}

const tracking = async (req, res, next) => {
    try {
        const data = await service.getTracking(req.user, { categoryId: req.query.categoryId, weekStart: req.query.weekStart || undefined })
        res.json({ success: true, data })

    } catch (error) {
        next(error)
    }
}

const memberTracking = async (req, res, next) => {
    try {
        const data = await service.getMemberTracking(req.user, req.params.memberId, { weeks: req.query.weeks })
        res.json({ success: true, data })

    } catch (error) {
        next(error)
    }
}

module.exports = {
    saveLog,
    myProgress,
    myGoals,
    createGoal,
    updateGoal,
    setGoalState,
    tracking,
    memberTracking,
    categories,
    week,
    weeks,
    create,
    update,
    remove,
    mine
}
