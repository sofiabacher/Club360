// Módulo access: roles, permisos y su asignación.
// Cada ruta encadena: isAuth → checkPermission('módulo.acción') → reglas del validator → validateFields → controller
const express = require('express')

// const isAuth = require('../../middlewares/isAuth')
// const checkPermission = require('../../middlewares/checkPermission')
// const validateFields = require('../../middlewares/validateFields')
// const controller = require('./access.controller')
// const validator = require('./access.validator')

const router = express.Router()

// Ejemplo:
// router.get('/', isAuth, checkPermission('access.view'), validator.list, validateFields, controller.list)

module.exports = router
