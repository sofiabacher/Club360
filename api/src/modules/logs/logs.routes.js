// Módulo logs: bitácora y exportación a CSV.
// Cada ruta encadena: isAuth → checkPermission('módulo.acción') → reglas del validator → validateFields → controller
const express = require('express')

// const isAuth = require('../../middlewares/isAuth')
// const checkPermission = require('../../middlewares/checkPermission')
// const validateFields = require('../../middlewares/validateFields')
// const controller = require('./logs.controller')
// const validator = require('./logs.validator')

const router = express.Router()

// Ejemplo:
// router.get('/', isAuth, checkPermission('logs.view'), validator.list, validateFields, controller.list)

module.exports = router
