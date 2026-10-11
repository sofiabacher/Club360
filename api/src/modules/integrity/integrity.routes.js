// Módulo integrity: verificación y recálculo de DVH/DVV.
// Cada ruta encadena: isAuth → checkPermission('módulo.acción') → reglas del validator → validateFields → controller
const express = require('express')

// const isAuth = require('../../middlewares/isAuth')
// const checkPermission = require('../../middlewares/checkPermission')
// const validateFields = require('../../middlewares/validateFields')
// const controller = require('./integrity.controller')
// const validator = require('./integrity.validator')

const router = express.Router()

// Ejemplo:
// router.get('/', isAuth, checkPermission('integrity.view'), validator.list, validateFields, controller.list)

module.exports = router
