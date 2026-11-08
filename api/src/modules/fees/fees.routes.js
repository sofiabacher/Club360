// Módulo fees: cuotas sociales y deportivas, y pagos simulados.
// Cada ruta encadena: isAuth → checkPermission('módulo.acción') → reglas del validator → validateFields → controller
const express = require('express')

const isAuth = require('../../middlewares/isAuth')
const checkPermission = require('../../middlewares/checkPermission')
const validateFields = require('../../middlewares/validateFields')
const controller = require('./fees.controller')
const validator = require('./fees.validator')
const upload = require('../../middlewares/upload')
const { UPLOAD_FOLDERS } = require('../../utils/files')
const { PERMISSIONS } = require('../../utils/permissions')

const router = express.Router()

const manage = [isAuth, checkPermission(PERMISSIONS.FEES_MANAGE)]
const payer = [isAuth, checkPermission([PERMISSIONS.FEES_PAY_OWN, PERMISSIONS.FEES_MANAGE_LINKED])]

// Socio, Familia y Representante (van antes de /:id)
router.get('/mine', isAuth, checkPermission(PERMISSIONS.FEES_VIEW_OWN), controller.mine)
router.get('/linked', isAuth, checkPermission(PERMISSIONS.FEES_MANAGE_LINKED), validator.linked, validateFields, controller.linked)
router.get('/players', isAuth, checkPermission(PERMISSIONS.FEES_VIEW_PLAYERS), validator.players, validateFields, controller.players)
router.get('/transfer-info', ...payer, controller.transferInfo)

// Pagos: historial y revisión de transferencias (Admin)
router.get('/payments', ...manage, validator.payments, validateFields, controller.payments)
router.post('/payments/:id/approve', ...manage, validator.paymentId, validateFields, controller.approveTransfer)
router.post('/payments/:id/reject', ...manage, validator.reject, validateFields, controller.rejectTransfer)

// Comprobante adjunto y comprobante de pago: con sesión; el acceso (fees.manage, quien pagó, el socio o su adulto) lo
// controla el service, que responde 404 si no corresponde
router.get('/payments/:id/receipt-file', isAuth, validator.paymentId, validateFields, controller.receiptFile)
router.get('/payments/:id/voucher', isAuth, validator.paymentId, validateFields, controller.voucher)

// Admin
router.get('/', ...manage, validator.list, validateFields, controller.list)
router.get('/members/:memberId', ...manage, validator.memberAccount, validateFields, controller.memberAccount)
router.post('/generate', ...manage, validator.generate, validateFields, controller.generate)
router.post('/:id/register-payment', ...manage, validator.registerPayment, validateFields, controller.registerPayment)

// Pago: el propio socio (mayor) o el adulto Familia por una vinculada
router.post('/:id/pay', ...payer, validator.pay, validateFields, controller.pay)
// Transferencia: el id se valida antes de subir el archivo (así no queda un archivo suelto)
router.post('/:id/transfer', ...payer, validator.transfer, validateFields, upload(UPLOAD_FOLDERS.RECEIPTS).single('receipt'), controller.transfer)

module.exports = router
