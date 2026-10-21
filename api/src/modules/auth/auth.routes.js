// Módulo auth: login, registro con número de socio, rol activo, sesión, recuperación de contraseña y Mi cuenta.
// Cada ruta encadena: isAuth → checkPermission('módulo.acción') → reglas del validator → validateFields → controller
const express = require('express')

const isAuth = require('../../middlewares/isAuth')
const checkPermission = require('../../middlewares/checkPermission')
const validateFields = require('../../middlewares/validateFields')
const upload = require('../../middlewares/upload')
const controller = require('./auth.controller')
const validator = require('./auth.validator')
const { PERMISSIONS } = require('../../utils/permissions')
const { UPLOAD_FOLDERS } = require('../../utils/files')

const router = express.Router()

// Sesión: sin checkPermission, porque son las que se pueden usar sin rol activo
router.post('/login', validator.login, validateFields, controller.login)
router.post('/register-member', validator.registerMember, validateFields, controller.registerMember)
router.post('/switch-role', isAuth, validator.switchRole, validateFields, controller.switchRole)
router.get('/me', isAuth, controller.me)
router.post('/logout', isAuth, controller.logout)

// Recuperación de contraseña (públicas)
router.post('/forgot-password', validator.forgotPassword, validateFields, controller.forgotPassword)
router.get('/reset-password/validate', validator.validateResetToken, validateFields, controller.validateResetToken)
router.post('/reset-password', validator.resetPassword, validateFields, controller.resetPassword)

// Mi cuenta
const manageAccount = [isAuth, checkPermission(PERMISSIONS.AUTH_MANAGE_ACCOUNT)]

router.get('/account', ...manageAccount, controller.getAccount)
router.put('/account', ...manageAccount, validator.updateAccount, validateFields, controller.updateAccount)
router.post('/account/photo', ...manageAccount, upload(UPLOAD_FOLDERS.AVATARS).single('photo'), controller.updatePhoto)
router.put('/account/password', ...manageAccount, validator.changePassword, validateFields, controller.changePassword)

module.exports = router
