// Controller de games.
// Lee req (params, query, body, user), llama al service y responde { success: true, data } o { success: false, message }.
// Sin lógica de negocio ni acceso a modelos. Los errores se pasan con next(error).
const service = require('./games.service')

// ---------- Fixture (games.manage) ----------

const options = async (req, res, next) => {
    try {
        const data = await service.getOptions(req.user)
        res.json({ success: true, data })

    } catch (error) {
        next(error)
    }
}

const list = async (req, res, next) => {
    try {
        const { categoryId, state, from, to, page } = req.query
        const data = await service.listGames(req.user, { categoryId, state, from, to, page })
        res.json({ success: true, data })

    } catch (error) {
        next(error)
    }
}

const checkConflicts = async (req, res, next) => {
    try {
        const { categoryId, dateTime, gameId } = req.body
        const data = await service.checkConflicts(req.user, { categoryId, dateTime, gameId })
        res.json({ success: true, data })

    } catch (error) {
        next(error)
    }
}

const create = async (req, res, next) => {
    try {
        const { categoryId, rival, dateTime, isHome, address } = req.body
        const data = await service.createGame(req.user, { categoryId, rival, dateTime, isHome, address })
        res.status(201).json({ success: true, data })

    } catch (error) {
        next(error)
    }
}

const update = async (req, res, next) => {
    try {
        const { rival, dateTime, isHome, address } = req.body
        const data = await service.updateGame(req.user, req.params.id, { rival, dateTime, isHome, address })
        res.json({ success: true, data })

    } catch (error) {
        next(error)
    }
}

const markPlayed = async (req, res, next) => {
    try {
        const data = await service.markPlayed(req.user, req.params.id)
        res.json({ success: true, data })

    } catch (error) {
        next(error)
    }
}

const cancel = async (req, res, next) => {
    try {
        const data = await service.cancelGame(req.user, req.params.id, { reason: req.body.reason })
        res.json({ success: true, data })

    } catch (error) {
        next(error)
    }
}

// ---------- Staff ----------

const assigned = async (req, res, next) => {
    try {
        const { from, to } = req.query
        const data = await service.listAssigned(req.user, { from, to })
        res.json({ success: true, data })

    } catch (error) {
        next(error)
    }
}

const conflicts = async (req, res, next) => {
    try {
        const data = await service.listMyConflicts(req.user)
        res.json({ success: true, data })

    } catch (error) {
        next(error)
    }
}

const resolveConflict = async (req, res, next) => {
    try {
        const { memberId, gameIds, chosenGameId, note } = req.body
        const data = await service.resolveConflict(req.user, { memberId, gameIds, chosenGameId, note })
        res.json({ success: true, data })

    } catch (error) {
        next(error)
    }
}

// ---------- Jugadora y Familia ----------

const mine = async (req, res, next) => {
    try {
        const { from, to } = req.query
        const data = await service.listMine(req.user, { from, to })
        res.json({ success: true, data })

    } catch (error) {
        next(error)
    }
}

const linked = async (req, res, next) => {
    try {
        const { memberId, from, to } = req.query
        const data = await service.listLinked(req.user, { memberId, from, to })
        res.json({ success: true, data })

    } catch (error) {
        next(error)
    }
}

module.exports = {
    options,
    list,
    checkConflicts,
    create,
    update,
    markPlayed,
    cancel,
    assigned,
    conflicts,
    resolveConflict,
    mine,
    linked
}
