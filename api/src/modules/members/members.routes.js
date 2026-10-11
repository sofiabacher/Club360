// Módulo members: socios, vínculo familiar y mayoría de edad.
// Cada ruta encadena: isAuth → checkPermission('módulo.acción') → reglas del validator → validateFields → controller
const express = require('express')

// const isAuth = require('../../middlewares/isAuth')
// const checkPermission = require('../../middlewares/checkPermission')
// const validateFields = require('../../middlewares/validateFields')
// const controller = require('./members.controller')
// const validator = require('./members.validator')

const router = express.Router()

// Ejemplo:
// router.get('/', isAuth, checkPermission('members.view'), validator.list, validateFields, controller.list)

module.exports = router
