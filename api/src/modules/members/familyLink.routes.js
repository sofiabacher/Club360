// Módulo members, grupo "Vincularme como Familia": el adulto responsable se vincula a un socio menor con su código.
// Las tres primeras son públicas (desde la pantalla de inicio de sesión). La última es para un usuario con la sesión
// iniciada, con cualquier rol: por eso lleva isAuth pero no checkPermission.
// Cada ruta encadena: isAuth → checkPermission('módulo.acción') → reglas del validator → validateFields → controller
const express = require('express')

const isAuth = require('../../middlewares/isAuth')
const validateFields = require('../../middlewares/validateFields')
const controller = require('./members.controller')
const validator = require('./members.validator')

const router = express.Router()

router.post('/validate', validator.validateFamilyCode, validateFields, controller.validateFamilyCode)
router.post('/new-account', validator.linkWithNewAccount, validateFields, controller.linkWithNewAccount)
router.post('/existing-account', validator.linkWithExistingAccount, validateFields, controller.linkWithExistingAccount)
router.post('/', isAuth, validator.linkFromAccount, validateFields, controller.linkFromAccount)

module.exports = router
