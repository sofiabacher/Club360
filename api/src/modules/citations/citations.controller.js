// Controller de citations.
// Lee req (params, query, body, user), llama al service y responde { success: true, data } o { success: false, message }.
// Sin lógica de negocio ni acceso a modelos. Los errores se pasan con next(error).
const service = require('./citations.service')

// ---------- Entrenadora ----------

const coachGames = async (req, res, next) => {
    try {
        const data = await service.listCoachGames(req.user, { from: req.query.from })
        res.json({ success: true, data })

    } catch (error) {
        next(error)
    }
}

const gameRoster = async (req, res, next) => {
    try {
        const data = await service.getGameRoster(req.user, req.params.gameId)
        res.json({ success: true, data })

    } catch (error) {
        next(error)
    }
}

const create = async (req, res, next) => {
    try {
        const data = await service.createCitations(req.user, req.params.gameId, { memberIds: req.body.memberIds })
        res.status(201).json({ success: true, data })

    } catch (error) {
        next(error)
    }
}

const cancel = async (req, res, next) => {
    try {
        const data = await service.cancelCitation(req.user, req.params.id)
        res.json({ success: true, data })

    } catch (error) {
        next(error)
    }
}

// ---------- Jugadora y Familia ----------

const mine = async (req, res, next) => {
    try {
        const data = await service.listMine(req.user, { scope: req.query.scope })
        res.json({ success: true, data })

    } catch (error) {
        next(error)
    }
}

const respond = async (req, res, next) => {
    try {
        const { response, justification } = req.body
        const data = await service.respond(req.user, req.params.id, { response, justification })
        res.json({ success: true, data })

    } catch (error) {
        next(error)
    }
}

const linked = async (req, res, next) => {
    try {
        const { memberId, scope } = req.query
        const data = await service.listLinked(req.user, { memberId, scope })
        res.json({ success: true, data })

    } catch (error) {
        next(error)
    }
}

module.exports = {
    coachGames,
    gameRoster,
    create,
    cancel,
    mine,
    respond,
    linked
}
