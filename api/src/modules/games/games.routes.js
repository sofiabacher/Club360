// Módulo games: partidos (fixture) y detección de superposiciones.
// Cada ruta encadena: isAuth → checkPermission('módulo.acción') → reglas del validator → validateFields → controller
const express = require('express')

// const isAuth = require('../../middlewares/isAuth')
// const checkPermission = require('../../middlewares/checkPermission')
// const validateFields = require('../../middlewares/validateFields')
// const controller = require('./games.controller')
// const validator = require('./games.validator')

const router = express.Router()

// Ejemplo:
// router.get('/', isAuth, checkPermission('games.view'), validator.list, validateFields, controller.list)

module.exports = router
