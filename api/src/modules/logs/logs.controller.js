// Controller de logs.
// Lee req (params, query, body, user), llama al service y responde { success: true, data } o { success: false, message }.
// Sin lógica de negocio ni acceso a modelos. Los errores se pasan con next(error).
const service = require('./logs.service')

const filtersOf = ({ from, to, criticity, action, userId, search }) => ({ from, to, criticity, action, userId, search })

const list = async (req, res, next) => {
    try {
        const data = await service.listLogs(req.user, { ...filtersOf(req.query), page: req.query.page })
        res.json({ success: true, data })

    } catch (error) {
        next(error)
    }
}

const filters = async (req, res, next) => {
    try {
        const data = await service.getFilters(req.user)
        res.json({ success: true, data })

    } catch (error) {
        next(error)
    }
}

// Descarga el CSV (UTF-8 con BOM)
const exportCsv = async (req, res, next) => {
    try {
        const { fileName, content } = await service.exportLogs(req.user, filtersOf(req.query))
        res.set({ 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${fileName}"` })
        res.send(content)

    } catch (error) {
        next(error)
    }
}

module.exports = {
    list,
    filters,
    exportCsv
}
