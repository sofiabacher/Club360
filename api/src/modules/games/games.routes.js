// Módulo games: partidos (fixture), superposiciones de horario y su resolución, y las vistas de partidos.
// Cada ruta encadena: isAuth → checkPermission('módulo.acción') → reglas del validator → validateFields → controller
const express = require('express')

const isAuth = require('../../middlewares/isAuth')
const checkPermission = require('../../middlewares/checkPermission')
const validateFields = require('../../middlewares/validateFields')
const controller = require('./games.controller')
const validator = require('./games.validator')
const { PERMISSIONS } = require('../../utils/permissions')

const router = express.Router()

const manage = [isAuth, checkPermission(PERMISSIONS.GAMES_MANAGE)]
const resolveConflicts = [isAuth, checkPermission(PERMISSIONS.GAMES_RESOLVE_CONFLICTS)]

// Vistas (van antes de /:id)
router.get('/assigned', isAuth, checkPermission(PERMISSIONS.GAMES_VIEW_ASSIGNED), validator.range, validateFields, controller.assigned)
router.get('/mine', isAuth, checkPermission(PERMISSIONS.GAMES_VIEW_OWN), validator.range, validateFields, controller.mine)
router.get('/linked', isAuth, checkPermission(PERMISSIONS.GAMES_VIEW_LINKED), validator.linked, validateFields, controller.linked)

// Conflictos de horario (entrenadoras)
router.get('/conflicts', ...resolveConflicts, controller.conflicts)
router.post('/conflicts/resolve', ...resolveConflicts, validator.resolve, validateFields, controller.resolveConflict)

// Fixture
router.get('/options', ...manage, controller.options)   // Categorías del alcance y canchas del club, para el formulario
router.get('/', ...manage, validator.list, validateFields, controller.list)
router.post('/check-conflicts', ...manage, validator.checkConflicts, validateFields, controller.checkConflicts)
router.post('/', ...manage, validator.create, validateFields, controller.create)
router.put('/:id', ...manage, validator.update, validateFields, controller.update)
router.post('/:id/played', ...manage, validator.byId, validateFields, controller.markPlayed)
router.post('/:id/cancel', ...manage, validator.cancel, validateFields, controller.cancel)

module.exports = router
