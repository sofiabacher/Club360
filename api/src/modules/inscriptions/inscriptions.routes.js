// Módulo inscriptions: inscripción y baja a un deporte, y su aprobación.
// Cada ruta encadena: isAuth → checkPermission('módulo.acción') → reglas del validator → validateFields → controller
const express = require('express')

const isAuth = require('../../middlewares/isAuth')
const checkPermission = require('../../middlewares/checkPermission')
const validateFields = require('../../middlewares/validateFields')
const controller = require('./inscriptions.controller')
const validator = require('./inscriptions.validator')
const { PERMISSIONS } = require('../../utils/permissions')

const router = express.Router()

const approve = [isAuth, checkPermission(PERMISSIONS.INSCRIPTIONS_APPROVE)]

// Socio: sus deportes, pedir la inscripción y cancelarla o darse de baja (van antes de /:id)
router.get('/mine', isAuth, checkPermission(PERMISSIONS.INSCRIPTIONS_REQUEST), controller.mine)
router.post('/', isAuth, checkPermission(PERMISSIONS.INSCRIPTIONS_REQUEST), validator.request, validateFields, controller.request)
router.post('/:id/withdraw', isAuth, checkPermission(PERMISSIONS.INSCRIPTIONS_WITHDRAW), validator.byId, validateFields, controller.withdraw)

// Representante: solicitudes de su deporte
router.get('/', ...approve, validator.list, validateFields, controller.list)
router.post('/:id/approve', ...approve, validator.byId, validateFields, controller.approve)
router.post('/:id/reject', ...approve, validator.reject, validateFields, controller.reject)

module.exports = router
