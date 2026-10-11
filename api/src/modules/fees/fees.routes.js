// Módulo fees: cuotas sociales y deportivas, y pagos simulados.
// Cada ruta encadena: isAuth → checkPermission('módulo.acción') → reglas del validator → validateFields → controller
const express = require('express')

// const isAuth = require('../../middlewares/isAuth')
// const checkPermission = require('../../middlewares/checkPermission')
// const validateFields = require('../../middlewares/validateFields')
// const controller = require('./fees.controller')
// const validator = require('./fees.validator')

const router = express.Router()

// Ejemplo:
// router.get('/', isAuth, checkPermission('fees.view'), validator.list, validateFields, controller.list)

module.exports = router
