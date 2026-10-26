// Módulo staff: alta, modificación, baja, reactivación y desbloqueo del staff, y reenvío de la activación de su cuenta.
// Cada ruta encadena: isAuth → checkPermission('módulo.acción') → reglas del validator → validateFields → controller
const express = require('express')

const isAuth = require('../../middlewares/isAuth')
const checkPermission = require('../../middlewares/checkPermission')
const validateFields = require('../../middlewares/validateFields')
const controller = require('./staff.controller')
const validator = require('./staff.validator')
const { PERMISSIONS } = require('../../utils/permissions')

const router = express.Router()

const manageStaff = [isAuth, checkPermission(PERMISSIONS.STAFF_MANAGE)]

router.get('/', ...manageStaff, validator.list, validateFields, controller.list)
router.get('/options', ...manageStaff, controller.getOptions)   // Roles de staff y deportes activos, para el formulario
router.post('/', ...manageStaff, validator.create, validateFields, controller.create)
router.get('/:id', ...manageStaff, validator.byId, validateFields, controller.getById)
router.put('/:id', ...manageStaff, validator.update, validateFields, controller.update)
router.post('/:id/deactivate', ...manageStaff, validator.byId, validateFields, controller.deactivate)
router.post('/:id/reactivate', ...manageStaff, validator.reactivate, validateFields, controller.reactivate)
router.post('/:id/unblock', ...manageStaff, validator.byId, validateFields, controller.unblock)
router.post('/:id/resend-activation', ...manageStaff, validator.byId, validateFields, controller.resendActivation)

module.exports = router
