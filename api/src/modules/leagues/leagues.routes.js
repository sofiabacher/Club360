// Módulo leagues: ligas, categorías y asignación de jugadoras y staff.
// Cada ruta encadena: isAuth → checkPermission('módulo.acción') → reglas del validator → validateFields → controller
const express = require('express')

// const isAuth = require('../../middlewares/isAuth')
// const checkPermission = require('../../middlewares/checkPermission')
// const validateFields = require('../../middlewares/validateFields')
// const controller = require('./leagues.controller')
// const validator = require('./leagues.validator')

const router = express.Router()

// Ejemplo:
// router.get('/', isAuth, checkPermission('leagues.view'), validator.list, validateFields, controller.list)

module.exports = router
