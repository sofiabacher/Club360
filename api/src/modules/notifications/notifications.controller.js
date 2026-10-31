// Controller de notifications.
// Lee req (params, query, body, user), llama al service y responde { success: true, data } o { success: false, message }.
// Sin lógica de negocio ni acceso a modelos. Los errores se pasan con next(error).
const service = require('./notifications.service')

// ---------- Notificaciones del usuario ----------

const list = async (req, res, next) => {
    try {
        const { unread, page } = req.query
        const data = await service.listNotifications(req.user, { unread, page })
        res.json({ success: true, data })

    } catch (error) {
        next(error)
    }
}

const unreadCount = async (req, res, next) => {
    try {
        const data = await service.getUnreadCount(req.user)
        res.json({ success: true, data })

    } catch (error) {
        next(error)
    }
}

const markAsRead = async (req, res, next) => {
    try {
        const data = await service.markAsRead(req.user, req.params.id)
        res.json({ success: true, data })

    } catch (error) {
        next(error)
    }
}

const markAllAsRead = async (req, res, next) => {
    try {
        const data = await service.markAllAsRead(req.user)
        res.json({ success: true, data })

    } catch (error) {
        next(error)
    }
}

// ---------- Avisos generales ----------

const sendOptions = async (req, res, next) => {
    try {
        const data = await service.getSendOptions(req.user)
        res.json({ success: true, data })

    } catch (error) {
        next(error)
    }
}

const preview = async (req, res, next) => {
    try {
        const data = await service.previewNotice(req.user, { audience: req.body.audience })
        res.json({ success: true, data })

    } catch (error) {
        next(error)
    }
}

const send = async (req, res, next) => {
    try {
        const { audience, title, message, sendEmail } = req.body
        const data = await service.sendNotice(req.user, { audience, title, message, sendEmail })
        res.status(201).json({ success: true, data })

    } catch (error) {
        next(error)
    }
}

module.exports = {
    list,
    unreadCount,
    markAsRead,
    markAllAsRead,
    sendOptions,
    preview,
    send
}
