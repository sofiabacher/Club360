// Módulo citations: generación, respuesta y confirmación automática de citaciones.
// Cada ruta encadena: isAuth → checkPermission('módulo.acción') → reglas del validator → validateFields → controller
const express = require('express')

// const isAuth = require('../../middlewares/isAuth')
// const checkPermission = require('../../middlewares/checkPermission')
// const validateFields = require('../../middlewares/validateFields')
// const controller = require('./citations.controller')
// const validator = require('./citations.validator')

const router = express.Router()

// Ejemplo:
// router.get('/', isAuth, checkPermission('citations.view'), validator.list, validateFields, controller.list)

module.exports = router
