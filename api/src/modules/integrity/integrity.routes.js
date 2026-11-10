// Módulo integrity: verificación y recálculo de DVH/DVV, y estado del club (bloqueo).
// Cada ruta encadena: isAuth → checkPermission('módulo.acción') → reglas del validator → validateFields → controller
const express = require('express')

const isAuth = require('../../middlewares/isAuth')
const checkPermission = require('../../middlewares/checkPermission')
const validateFields = require('../../middlewares/validateFields')
const controller = require('./integrity.controller')
const validator = require('./integrity.validator')
const { PERMISSIONS } = require('../../utils/permissions')

const router = express.Router()

const manage = [isAuth, checkPermission(PERMISSIONS.INTEGRITY_MANAGE)]

// Con sesión: el estado del club (desde la caché), para el aviso del layout
router.get('/status', isAuth, controller.status)

router.post('/verify', ...manage, controller.verify)
router.post('/repair', ...manage, validator.repair, validateFields, controller.repair)
router.get('/report.csv', ...manage, controller.reportCsv)

module.exports = router
