// Controller de inscriptions.
// Lee req (params, query, body, user), llama al service y responde { success: true, data } o { success: false, message }.
// Sin lógica de negocio ni acceso a modelos. Los errores se pasan con next(error).
const service = require('./inscriptions.service')

// ---------- Socio ----------

const mine = async (req, res, next) => {
    try {
        const data = await service.listMine(req.user)
        res.json({ success: true, data })

    } catch (error) {
        next(error)
    }
}

const request = async (req, res, next) => {
    try {
        const data = await service.requestInscription(req.user, { clubSportId: req.body.clubSportId })
        res.status(201).json({ success: true, data })

    } catch (error) {
        next(error)
    }
}

const withdraw = async (req, res, next) => {
    try {
        const data = await service.withdraw(req.user, req.params.id)
        res.json({ success: true, data })

    } catch (error) {
        next(error)
    }
}

// ---------- Representante ----------

const list = async (req, res, next) => {
    try {
        const { state, clubSportId, search, page } = req.query
        const data = await service.listInscriptions(req.user, { state, clubSportId, search, page })
        res.json({ success: true, data })

    } catch (error) {
        next(error)
    }
}

const approve = async (req, res, next) => {
    try {
        const data = await service.approveInscription(req.user, req.params.id)
        res.json({ success: true, data })

    } catch (error) {
        next(error)
    }
}

const reject = async (req, res, next) => {
    try {
        const data = await service.rejectInscription(req.user, req.params.id, { reason: req.body.reason })
        res.json({ success: true, data })

    } catch (error) {
        next(error)
    }
}

module.exports = {
    mine,
    request,
    withdraw,
    list,
    approve,
    reject
}
