// Módulo clubs: parámetros del club y activación de deportes.
// Cada ruta encadena: isAuth → checkPermission('módulo.acción') → reglas del validator → validateFields → controller
const express = require('express')

const isAuth = require('../../middlewares/isAuth')
const checkPermission = require('../../middlewares/checkPermission')
const validateFields = require('../../middlewares/validateFields')
const controller = require('./clubs.controller')
const validator = require('./clubs.validator')
const { PERMISSIONS } = require('../../utils/permissions')

const router = express.Router()

const manageSettings = [isAuth, checkPermission(PERMISSIONS.CLUBS_MANAGE_SETTINGS)]
const manageSports = [isAuth, checkPermission(PERMISSIONS.CLUBS_MANAGE_SPORTS)]

// Información pública del club (pantalla "El club")
router.get('/info', isAuth, checkPermission(PERMISSIONS.CLUBS_VIEW_INFO), controller.getInfo)

// Configuración del club
router.get('/settings', ...manageSettings, controller.getSettings)
router.put('/settings', ...manageSettings, validator.updateSettings, validateFields, controller.updateSettings)

// Deportes del club
router.get('/sports', ...manageSports, controller.listSports)
router.put('/sports/:sportId', ...manageSports, validator.updateSport, validateFields, controller.updateSport)

module.exports = router
