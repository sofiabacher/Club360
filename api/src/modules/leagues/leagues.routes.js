// Módulo leagues: ligas, categorías y asignación de jugadoras y staff.
// Cada ruta encadena: isAuth → checkPermission('módulo.acción') → reglas del validator → validateFields → controller
const express = require('express')

const isAuth = require('../../middlewares/isAuth')
const checkPermission = require('../../middlewares/checkPermission')
const validateFields = require('../../middlewares/validateFields')
const controller = require('./leagues.controller')
const validator = require('./leagues.validator')
const { PERMISSIONS } = require('../../utils/permissions')

const router = express.Router()

const manage = [isAuth, checkPermission(PERMISSIONS.LEAGUES_MANAGE)]
const assignPlayers = [isAuth, checkPermission(PERMISSIONS.LEAGUES_ASSIGN_PLAYERS)]
const assignStaff = [isAuth, checkPermission(PERMISSIONS.LEAGUES_ASSIGN_STAFF)]

// El detalle de una categoría se ve con cualquiera de los tres permisos
const viewCategory = [isAuth, checkPermission([PERMISSIONS.LEAGUES_MANAGE, PERMISSIONS.LEAGUES_ASSIGN_PLAYERS, PERMISSIONS.LEAGUES_ASSIGN_STAFF])]

// Mis categorías (Entrenadora y Preparadora física)
router.get('/my-categories', isAuth, checkPermission(PERMISSIONS.LEAGUES_VIEW_ASSIGNED), controller.myCategories)

// Ligas
router.get('/', ...manage, validator.list, validateFields, controller.list)
router.post('/', ...manage, validator.createLeague, validateFields, controller.createLeague)
router.put('/:id', ...manage, validator.updateLeague, validateFields, controller.updateLeague)
router.post('/:id/deactivate', ...manage, validator.byId, validateFields, controller.deactivateLeague)
router.post('/:id/reactivate', ...manage, validator.byId, validateFields, controller.reactivateLeague)
router.post('/:id/categories', ...manage, validator.createCategory, validateFields, controller.createCategory)

// Categorías
router.get('/categories/:id', ...viewCategory, validator.byId, validateFields, controller.getCategory)
router.put('/categories/:id', ...manage, validator.updateCategory, validateFields, controller.updateCategory)
router.post('/categories/:id/deactivate', ...manage, validator.byId, validateFields, controller.deactivateCategory)
router.post('/categories/:id/reactivate', ...manage, validator.byId, validateFields, controller.reactivateCategory)

// Jugadoras de una categoría
router.get('/categories/:id/eligible-players', ...assignPlayers, validator.eligiblePlayers, validateFields, controller.eligiblePlayers)
router.post('/categories/:id/players', ...assignPlayers, validator.assignPlayers, validateFields, controller.assignPlayers)
router.delete('/categories/:id/players/:memberId', ...assignPlayers, validator.unassignPlayer, validateFields, controller.unassignPlayer)

// Staff de una categoría
router.get('/categories/:id/eligible-staff', ...assignStaff, validator.byId, validateFields, controller.eligibleStaff)
router.post('/categories/:id/staff', ...assignStaff, validator.assignStaff, validateFields, controller.assignStaff)
router.delete('/categories/:id/staff/:staffId', ...assignStaff, validator.unassignStaff, validateFields, controller.unassignStaff)

module.exports = router
