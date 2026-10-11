// Módulo notifications: notificaciones in-app y por email.
// Cada ruta encadena: isAuth → checkPermission('módulo.acción') → reglas del validator → validateFields → controller
const express = require('express')

// const isAuth = require('../../middlewares/isAuth')
// const checkPermission = require('../../middlewares/checkPermission')
// const validateFields = require('../../middlewares/validateFields')
// const controller = require('./notifications.controller')
// const validator = require('./notifications.validator')

const router = express.Router()

// Ejemplo:
// router.get('/', isAuth, checkPermission('notifications.view'), validator.list, validateFields, controller.list)

module.exports = router
