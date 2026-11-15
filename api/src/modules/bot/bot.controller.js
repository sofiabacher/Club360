// Controller de bot.
// Lee req (params, query, body, user), llama al service y responde { success: true, data } o { success: false, message }.
// Sin lógica de negocio ni acceso a modelos. Los errores se pasan con next(error).
const service = require('./bot.service')

const menu = async (req, res, next) => {
    try {
        const data = await service.getMenu(req.user, { screen: req.query.screen })
        res.json({ success: true, data })

    } catch (error) {
        next(error)
    }
}

const chat = async (req, res, next) => {
    try {
        const { type, message, intent, screen } = req.body
        const data = await service.chat(req.user, { type, message, intent, screen })
        res.json({ success: true, data })

    } catch (error) {
        next(error)
    }
}

const feedback = async (req, res, next) => {
    try {
        const { interactionId, useful } = req.body
        const data = await service.saveFeedback(req.user, { interactionId, useful })
        res.json({ success: true, data })

    } catch (error) {
        next(error)
    }
}

module.exports = {
    menu,
    chat,
    feedback
}
