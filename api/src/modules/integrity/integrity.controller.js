// Controller de integrity.
// Lee req (params, query, body, user), llama al service y responde { success: true, data } o { success: false, message }.
// Sin lógica de negocio ni acceso a modelos. Los errores se pasan con next(error).
const service = require('./integrity.service')
const { fileStamp, slugOf } = require('../../utils/csv')

const status = async (req, res, next) => {
    try {
        const data = await service.getStatus(req.user)
        res.json({ success: true, data })

    } catch (error) {
        next(error)
    }
}

const verify = async (req, res, next) => {
    try {
        const data = await service.verifyNow(req.user)
        res.json({ success: true, data })

    } catch (error) {
        next(error)
    }
}

const repair = async (req, res, next) => {
    try {
        const data = await service.repair(req.user, { tables: req.body.tables ?? [], all: req.body.all === true })
        res.json({ success: true, data })

    } catch (error) {
        next(error)
    }
}

// Descarga el informe en CSV (UTF-8 con BOM)
const reportCsv = async (req, res, next) => {
    try {
        const { clubName, content } = await service.getReportCsv(req.user)
        const fileName = `integridad-${slugOf(clubName)}-${fileStamp().minutes}.csv`
        res.set({ 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${fileName}"` })
        res.send(content)

    } catch (error) {
        next(error)
    }
}

module.exports = {
    status,
    verify,
    repair,
    reportCsv
}
