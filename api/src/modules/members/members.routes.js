// Módulo members: socios, vínculo familiar y mayoría de edad.
// Cada ruta encadena: isAuth → checkPermission('módulo.acción') → reglas del validator → validateFields → controller
const express = require('express')

const isAuth = require('../../middlewares/isAuth')
const checkPermission = require('../../middlewares/checkPermission')
const validateFields = require('../../middlewares/validateFields')
const controller = require('./members.controller')
const validator = require('./members.validator')
const { PERMISSIONS } = require('../../utils/permissions')

const router = express.Router()

const manageMembers = [isAuth, checkPermission(PERMISSIONS.MEMBERS_MANAGE)]

router.get('/', ...manageMembers, validator.list, validateFields, controller.list)
router.post('/', ...manageMembers, validator.create, validateFields, controller.create)
router.get('/:id', ...manageMembers, validator.byId, validateFields, controller.getById)
router.put('/:id', ...manageMembers, validator.update, validateFields, controller.update)
router.get('/:id/receipt', ...manageMembers, validator.byId, validateFields, controller.getReceipt)
router.post('/:id/deactivate', ...manageMembers, validator.byId, validateFields, controller.deactivate)
router.post('/:id/reactivate', ...manageMembers, validator.byId, validateFields, controller.reactivate)
router.post('/:id/unblock', ...manageMembers, validator.byId, validateFields, controller.unblock)

module.exports = router
