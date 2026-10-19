// Módulo auth: login, registro con número de socio, rol activo y sesión.
// Cada ruta encadena: isAuth → checkPermission('módulo.acción') → reglas del validator → validateFields → controller
// Estas rutas no llevan checkPermission: son las que se pueden usar sin rol activo.
const express = require('express')

const isAuth = require('../../middlewares/isAuth')
const validateFields = require('../../middlewares/validateFields')
const controller = require('./auth.controller')
const validator = require('./auth.validator')

const router = express.Router()

router.post('/login', validator.login, validateFields, controller.login)
router.post('/register-member', validator.registerMember, validateFields, controller.registerMember)
router.post('/switch-role', isAuth, validator.switchRole, validateFields, controller.switchRole)
router.get('/me', isAuth, controller.me)
router.post('/logout', isAuth, controller.logout)

module.exports = router
