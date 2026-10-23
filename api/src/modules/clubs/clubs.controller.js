// Controller de clubs.
// Lee req (params, query, body, user), llama al service y responde { success: true, data } o { success: false, message }.
// Sin lógica de negocio ni acceso a modelos. Los errores se pasan con next(error).
const service = require('./clubs.service')

const getInfo = async (req, res, next) => {
    try {
        const data = await service.getInfo(req.user)
        res.json({ success: true, data })

    } catch (error) {
        next(error)
    }
}

const getSettings = async (req, res, next) => {
    try {
        const data = await service.getSettings(req.user)
        res.json({ success: true, data })

    } catch (error) {
        next(error)
    }
}

const updateSettings = async (req, res, next) => {
    try {
        const { socialFee, delayFee, conflictMargin, address, phone, email, accentColor, extraInfo } = req.body
        const data = await service.updateSettings(req.user, { socialFee, delayFee, conflictMargin, address, phone, email, accentColor, extraInfo })
        res.json({ success: true, data })

    } catch (error) {
        next(error)
    }
}

const listSports = async (req, res, next) => {
    try {
        const data = await service.listSports(req.user)
        res.json({ success: true, data })

    } catch (error) {
        next(error)
    }
}

const updateSport = async (req, res, next) => {
    try {
        const { isActive, priceFee } = req.body
        const data = await service.updateSport(req.user, req.params.sportId, { isActive, priceFee })
        res.json({ success: true, data })

    } catch (error) {
        next(error)
    }
}

module.exports = {
    getInfo,
    getSettings,
    updateSettings,
    listSports,
    updateSport
}
