// Módulo clubs: parámetros del club y activación de deportes.
// Cada ruta encadena: isAuth → checkPermission('módulo.acción') → reglas del validator → validateFields → controller
const express = require('express')

// const isAuth = require('../../middlewares/isAuth')
// const checkPermission = require('../../middlewares/checkPermission')
// const validateFields = require('../../middlewares/validateFields')
// const controller = require('./clubs.controller')
// const validator = require('./clubs.validator')

const router = express.Router()

// Ejemplo:
// router.get('/', isAuth, checkPermission('clubs.view'), validator.list, validateFields, controller.list)

module.exports = router
