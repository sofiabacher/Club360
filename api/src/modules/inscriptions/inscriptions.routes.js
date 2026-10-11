// Módulo inscriptions: inscripción y baja a un deporte, y su aprobación.
// Cada ruta encadena: isAuth → checkPermission('módulo.acción') → reglas del validator → validateFields → controller
const express = require('express')

// const isAuth = require('../../middlewares/isAuth')
// const checkPermission = require('../../middlewares/checkPermission')
// const validateFields = require('../../middlewares/validateFields')
// const controller = require('./inscriptions.controller')
// const validator = require('./inscriptions.validator')

const router = express.Router()

// Ejemplo:
// router.get('/', isAuth, checkPermission('inscriptions.view'), validator.list, validateFields, controller.list)

module.exports = router
