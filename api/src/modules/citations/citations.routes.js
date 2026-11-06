// Módulo citations: generación, respuesta y confirmación automática de citaciones.
// Cada ruta encadena: isAuth → checkPermission('módulo.acción') → reglas del validator → validateFields → controller
const express = require('express')

const isAuth = require('../../middlewares/isAuth')
const checkPermission = require('../../middlewares/checkPermission')
const validateFields = require('../../middlewares/validateFields')
const controller = require('./citations.controller')
const validator = require('./citations.validator')
const { PERMISSIONS } = require('../../utils/permissions')

const router = express.Router()

const create = [isAuth, checkPermission(PERMISSIONS.CITATIONS_CREATE)]
const respond = [isAuth, checkPermission(PERMISSIONS.CITATIONS_RESPOND)]

// Jugadora y Familia (van antes de /:id)
router.get('/mine', ...respond, validator.mine, validateFields, controller.mine)
router.get('/linked', isAuth, checkPermission(PERMISSIONS.CITATIONS_VIEW_LINKED), validator.linked, validateFields, controller.linked)

// Entrenadora: partidos de sus categorías, la lista de cada partido y las citaciones
router.get('/games', ...create, validator.coachGames, validateFields, controller.coachGames)
router.get('/games/:gameId', ...create, validator.byGame, validateFields, controller.gameRoster)
router.post('/games/:gameId', ...create, validator.create, validateFields, controller.create)
router.post('/:id/cancel', ...create, validator.byId, validateFields, controller.cancel)

// Respuesta de la jugadora
router.post('/:id/respond', ...respond, validator.respond, validateFields, controller.respond)

module.exports = router
