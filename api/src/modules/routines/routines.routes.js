// Módulo routines: rutinas semanales.
// Cada ruta encadena: isAuth → checkPermission('módulo.acción') → reglas del validator → validateFields → controller
const express = require('express')

// const isAuth = require('../../middlewares/isAuth')
// const checkPermission = require('../../middlewares/checkPermission')
// const validateFields = require('../../middlewares/validateFields')
// const controller = require('./routines.controller')
// const validator = require('./routines.validator')

const router = express.Router()

// Ejemplo:
// router.get('/', isAuth, checkPermission('routines.view'), validator.list, validateFields, controller.list)

module.exports = router
