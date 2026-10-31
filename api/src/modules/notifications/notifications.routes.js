// Módulo notifications: notificaciones del usuario (campana y listado) y envío de avisos generales.
// Cada ruta encadena: isAuth → checkPermission('módulo.acción') → reglas del validator → validateFields → controller
const express = require('express')

const isAuth = require('../../middlewares/isAuth')
const checkPermission = require('../../middlewares/checkPermission')
const validateFields = require('../../middlewares/validateFields')
const controller = require('./notifications.controller')
const validator = require('./notifications.validator')
const { PERMISSIONS } = require('../../utils/permissions')

const router = express.Router()

const view = [isAuth, checkPermission(PERMISSIONS.NOTIFICATIONS_VIEW)]

// Avisos generales: alcanza con cualquiera de los tres permisos de envío (cada uno habilita sus opciones de destinatarios)
const sendAny = [isAuth, checkPermission([
    PERMISSIONS.NOTIFICATIONS_SEND_ALL,
    PERMISSIONS.NOTIFICATIONS_SEND_SPORT,
    PERMISSIONS.NOTIFICATIONS_SEND_CATEGORY
])]

router.get('/', ...view, validator.list, validateFields, controller.list)
router.get('/unread-count', ...view, controller.unreadCount)
router.post('/read-all', ...view, controller.markAllAsRead)
router.get('/send-options', ...sendAny, controller.sendOptions)
router.post('/preview', ...sendAny, validator.preview, validateFields, controller.preview)
router.post('/send', ...sendAny, validator.send, validateFields, controller.send)
router.post('/:id/read', ...view, validator.byId, validateFields, controller.markAsRead)

module.exports = router
