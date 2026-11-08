// Controller de fees.
// Lee req (params, query, body, user), llama al service y responde { success: true, data } o { success: false, message }.
// Sin lógica de negocio ni acceso a modelos. Los errores se pasan con next(error).
const service = require('./fees.service')

// ---------- Socio y Familia ----------

const mine = async (req, res, next) => {
    try {
        const data = await service.getMine(req.user)
        res.json({ success: true, data })

    } catch (error) {
        next(error)
    }
}

const linked = async (req, res, next) => {
    try {
        const data = await service.getLinked(req.user, { memberId: req.query.memberId })
        res.json({ success: true, data })

    } catch (error) {
        next(error)
    }
}

// Los datos de la tarjeta no pasan al service salvo el número (para simular el resultado y los últimos 4 dígitos)
const pay = async (req, res, next) => {
    try {
        const data = await service.payFee(req.user, req.params.id, { cardNumber: req.body.cardNumber })
        res.json({ success: true, data })

    } catch (error) {
        next(error)
    }
}

// ---------- Admin ----------

const list = async (req, res, next) => {
    try {
        const { period, state, search, page } = req.query
        const data = await service.listFees(req.user, { period, state, search, page })
        res.json({ success: true, data })

    } catch (error) {
        next(error)
    }
}

const memberAccount = async (req, res, next) => {
    try {
        const data = await service.getMemberAccount(req.user, req.params.memberId)
        res.json({ success: true, data })

    } catch (error) {
        next(error)
    }
}

const generate = async (req, res, next) => {
    try {
        const data = await service.generateFees(req.user, { period: req.body.period })
        res.json({ success: true, data })

    } catch (error) {
        next(error)
    }
}

const registerPayment = async (req, res, next) => {
    try {
        const data = await service.registerPayment(req.user, req.params.id, { note: req.body.note })
        res.json({ success: true, data })

    } catch (error) {
        next(error)
    }
}

// ---------- Representante ----------

const players = async (req, res, next) => {
    try {
        const data = await service.listPlayers(req.user, { status: req.query.status, search: req.query.search })
        res.json({ success: true, data })

    } catch (error) {
        next(error)
    }
}

module.exports = {
    mine,
    linked,
    pay,
    list,
    memberAccount,
    generate,
    registerPayment,
    players
}
