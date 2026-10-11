// Módulo backup: backup y restore de la base.
// Cada ruta encadena: isAuth → checkPermission('módulo.acción') → reglas del validator → validateFields → controller
const express = require('express')

// const isAuth = require('../../middlewares/isAuth')
// const checkPermission = require('../../middlewares/checkPermission')
// const validateFields = require('../../middlewares/validateFields')
// const controller = require('./backup.controller')
// const validator = require('./backup.validator')

const router = express.Router()

// Ejemplo:
// router.get('/', isAuth, checkPermission('backup.view'), validator.list, validateFields, controller.list)

module.exports = router
