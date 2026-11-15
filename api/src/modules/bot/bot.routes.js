// Módulo bot: asistente de consultas generales (P21). Solo con bot.use.
// Cada ruta encadena: isAuth → checkPermission('módulo.acción') → reglas del validator → validateFields → controller
// El chat suma el límite de mensajes por usuario (express-rate-limit), después de isAuth para contar por usuario
const express = require('express')
const { rateLimit } = require('express-rate-limit')

const isAuth = require('../../middlewares/isAuth')
const checkPermission = require('../../middlewares/checkPermission')
const validateFields = require('../../middlewares/validateFields')
const controller = require('./bot.controller')
const validator = require('./bot.validator')
const { PERMISSIONS } = require('../../utils/permissions')
const { BOT_RATE_LIMIT_PER_MINUTE } = require('../../utils/constants')
const { bot: m } = require('../../utils/messages')

const router = express.Router()

const use = [isAuth, checkPermission(PERMISSIONS.BOT_USE)]

// 30 mensajes por minuto por usuario. Al pasarlo: 429
const chatLimit = rateLimit({
    windowMs: 60 * 1000,
    limit: BOT_RATE_LIMIT_PER_MINUTE,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    keyGenerator: (req) => `user-${req.user.id}`,
    handler: (req, res) => res.status(429).json({ success: false, message: m.rateLimited })
})

router.get('/menu', ...use, validator.menu, validateFields, controller.menu)
router.post('/chat', ...use, chatLimit, validator.chat, validateFields, controller.chat)
router.post('/feedback', ...use, validator.feedback, validateFields, controller.feedback)

module.exports = router
