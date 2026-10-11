// Módulo auth: login, registro con número de socio, activación, recuperación de contraseña y cambio de rol activo.
// Cada ruta encadena: isAuth → checkPermission('módulo.acción') → reglas del validator → validateFields → controller
const express = require('express')

// const isAuth = require('../../middlewares/isAuth')
// const checkPermission = require('../../middlewares/checkPermission')
// const validateFields = require('../../middlewares/validateFields')
// const controller = require('./auth.controller')
// const validator = require('./auth.validator')

const router = express.Router()

// Ejemplo:
// router.get('/', isAuth, checkPermission('auth.view'), validator.list, validateFields, controller.list)

module.exports = router
