// Módulo staff: alta y baja de staff.
// Cada ruta encadena: isAuth → checkPermission('módulo.acción') → reglas del validator → validateFields → controller
const express = require('express')

// const isAuth = require('../../middlewares/isAuth')
// const checkPermission = require('../../middlewares/checkPermission')
// const validateFields = require('../../middlewares/validateFields')
// const controller = require('./staff.controller')
// const validator = require('./staff.validator')

const router = express.Router()

// Ejemplo:
// router.get('/', isAuth, checkPermission('staff.view'), validator.list, validateFields, controller.list)

module.exports = router
