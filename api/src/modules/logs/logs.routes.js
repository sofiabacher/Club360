// Módulo logs: bitácora y exportación a CSV.
// Cada ruta encadena: isAuth → checkPermission('módulo.acción') → reglas del validator → validateFields → controller
const express = require('express')

const isAuth = require('../../middlewares/isAuth')
const checkPermission = require('../../middlewares/checkPermission')
const validateFields = require('../../middlewares/validateFields')
const controller = require('./logs.controller')
const validator = require('./logs.validator')
const { PERMISSIONS } = require('../../utils/permissions')

const router = express.Router()

router.get('/filters', isAuth, checkPermission(PERMISSIONS.LOGS_VIEW), controller.filters)
router.get('/export', isAuth, checkPermission(PERMISSIONS.LOGS_EXPORT), validator.exportCsv, validateFields, controller.exportCsv)
router.get('/', isAuth, checkPermission(PERMISSIONS.LOGS_VIEW), validator.list, validateFields, controller.list)

module.exports = router
