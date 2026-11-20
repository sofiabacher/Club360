// Controller de fees.
// Lee req (params, query, body, user), llama al service y responde { success: true, data } o { success: false, message }.
// Sin lógica de negocio ni acceso a modelos. Los errores se pasan con next(error).
const service = require('./fees.service')
const charges = require('./fees.charges.service')

// kind: lo que se paga, 'fee' (cuota) o 'charge' (cargo eventual de un socio). Lo fija la ruta

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
const pay = (kind) => async (req, res, next) => {
    try {
        const data = await service.payItem(req.user, kind, req.params.id, { cardNumber: req.body.cardNumber })
        res.json({ success: true, data })

    } catch (error) {
        next(error)
    }
}

// ---------- Transferencias y comprobantes ----------

const transferInfo = async (req, res, next) => {
    try {
        const data = await service.getTransferInfo(req.user)
        res.json({ success: true, data })

    } catch (error) {
        next(error)
    }
}

// El comprobante adjunto llega en req.file (middleware upload, campo receipt)
const transfer = (kind) => async (req, res, next) => {
    try {
        const data = await service.reportTransfer(req.user, kind, req.params.id, req.file)
        res.status(201).json({ success: true, data })

    } catch (error) {
        next(error)
    }
}

// Devuelve el archivo con su tipo, para verlo en el navegador. nosniff: el navegador no adivina otro tipo
const receiptFile = async (req, res, next) => {
    try {
        const { filePath, buffer, contentType, filename } = await service.getReceiptFile(req.user, req.params.id)
        res.set({ 'Content-Type': contentType, 'Content-Disposition': `inline; filename="${filename}"`, 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'private, no-store' })
        if (buffer) return res.send(buffer)   // Descargado de Cloudinary por el back
        res.sendFile(filePath, (error) => { if (error) next(error) })

    } catch (error) {
        next(error)
    }
}

const voucher = async (req, res, next) => {
    try {
        const data = await service.getVoucher(req.user, req.params.id)
        res.json({ success: true, data })

    } catch (error) {
        next(error)
    }
}

// ---------- Admin ----------

const payments = async (req, res, next) => {
    try {
        const { kind, method, state, search, from, to, page } = req.query
        const data = await service.listPayments(req.user, { kind, method, state, search, from, to, page })
        res.json({ success: true, data })

    } catch (error) {
        next(error)
    }
}

const approveTransfer = async (req, res, next) => {
    try {
        const data = await service.approveTransfer(req.user, req.params.id)
        res.json({ success: true, data })

    } catch (error) {
        next(error)
    }
}

const rejectTransfer = async (req, res, next) => {
    try {
        const data = await service.rejectTransfer(req.user, req.params.id, { reason: req.body.reason })
        res.json({ success: true, data })

    } catch (error) {
        next(error)
    }
}

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

const registerPayment = (kind) => async (req, res, next) => {
    try {
        const data = await service.registerPayment(req.user, kind, req.params.id, { note: req.body.note })
        res.json({ success: true, data })

    } catch (error) {
        next(error)
    }
}

// ---------- Cargos eventuales (Admin) ----------

const chargeOptions = async (req, res, next) => {
    try {
        const data = await charges.getChargeOptions(req.user)
        res.json({ success: true, data })

    } catch (error) {
        next(error)
    }
}

const previewCharge = async (req, res, next) => {
    try {
        const { targetType, targetIds } = req.body
        const data = await charges.previewCharge(req.user, { targetType, targetIds })
        res.json({ success: true, data })

    } catch (error) {
        next(error)
    }
}

const createCharge = async (req, res, next) => {
    try {
        const { concept, description, amount, expirationDate, targetType, targetIds } = req.body
        const data = await charges.createCharge(req.user, { concept, description, amount, expirationDate, targetType, targetIds })
        res.status(201).json({ success: true, data })

    } catch (error) {
        next(error)
    }
}

const listCharges = async (req, res, next) => {
    try {
        const data = await charges.listCharges(req.user)
        res.json({ success: true, data })

    } catch (error) {
        next(error)
    }
}

const getCharge = async (req, res, next) => {
    try {
        const data = await charges.getCharge(req.user, req.params.id)
        res.json({ success: true, data })

    } catch (error) {
        next(error)
    }
}

const cancelCharge = async (req, res, next) => {
    try {
        const data = await charges.cancelCharge(req.user, req.params.id)
        res.json({ success: true, data })

    } catch (error) {
        next(error)
    }
}

const cancelChargeItem = async (req, res, next) => {
    try {
        const data = await charges.cancelChargeItem(req.user, req.params.id)
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
    transferInfo,
    transfer,
    receiptFile,
    voucher,
    payments,
    approveTransfer,
    rejectTransfer,
    list,
    memberAccount,
    generate,
    registerPayment,
    chargeOptions,
    previewCharge,
    createCharge,
    listCharges,
    getCharge,
    cancelCharge,
    cancelChargeItem,
    players
}
