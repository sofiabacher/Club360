// Módulo fees: cuotas sociales y deportivas, y pagos simulados.
// Cada ruta encadena: isAuth → checkPermission('módulo.acción') → reglas del validator → validateFields → controller
const express = require('express')

const isAuth = require('../../middlewares/isAuth')
const checkPermission = require('../../middlewares/checkPermission')
const validateFields = require('../../middlewares/validateFields')
const controller = require('./fees.controller')
const validator = require('./fees.validator')
const { PERMISSIONS } = require('../../utils/permissions')

const router = express.Router()

const manage = [isAuth, checkPermission(PERMISSIONS.FEES_MANAGE)]

// Socio, Familia y Representante (van antes de /:id)
router.get('/mine', isAuth, checkPermission(PERMISSIONS.FEES_VIEW_OWN), controller.mine)
router.get('/linked', isAuth, checkPermission(PERMISSIONS.FEES_MANAGE_LINKED), validator.linked, validateFields, controller.linked)
router.get('/players', isAuth, checkPermission(PERMISSIONS.FEES_VIEW_PLAYERS), validator.players, validateFields, controller.players)

// Admin
router.get('/', ...manage, validator.list, validateFields, controller.list)
router.get('/members/:memberId', ...manage, validator.memberAccount, validateFields, controller.memberAccount)
router.post('/generate', ...manage, validator.generate, validateFields, controller.generate)
router.post('/:id/register-payment', ...manage, validator.registerPayment, validateFields, controller.registerPayment)

// Pago: el propio socio (mayor) o el adulto Familia por una vinculada
router.post('/:id/pay', isAuth, checkPermission([PERMISSIONS.FEES_PAY_OWN, PERMISSIONS.FEES_MANAGE_LINKED]), validator.pay, validateFields, controller.pay)

module.exports = router
