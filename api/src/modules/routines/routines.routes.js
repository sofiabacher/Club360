// Módulo routines: rutinas semanales y seguimiento personal de la jugadora (P20).
// Cada ruta encadena: isAuth → checkPermission('módulo.acción') → reglas del validator → validateFields → controller
// En las que reciben la imagen, el middleware upload va antes del validator (multipart: el body llega con multer).
// Si el validator falla, validateFields borra la imagen subida
const express = require('express')

const isAuth = require('../../middlewares/isAuth')
const checkPermission = require('../../middlewares/checkPermission')
const validateFields = require('../../middlewares/validateFields')
const upload = require('../../middlewares/upload')
const controller = require('./routines.controller')
const validator = require('./routines.validator')
const { UPLOAD_FOLDERS } = require('../../utils/files')
const { PERMISSIONS } = require('../../utils/permissions')

const router = express.Router()

const manage = [isAuth, checkPermission(PERMISSIONS.ROUTINES_MANAGE)]
const view = [isAuth, checkPermission([PERMISSIONS.ROUTINES_MANAGE, PERMISSIONS.ROUTINES_VIEW_ASSIGNED])]
const trackOwn = [isAuth, checkPermission(PERMISSIONS.ROUTINES_TRACK_OWN)]
const viewTracking = [isAuth, checkPermission(PERMISSIONS.ROUTINES_VIEW_TRACKING)]
const image = upload(UPLOAD_FOLDERS.ROUTINES).single('image')

// Jugadora (va antes de /:id)
router.get('/mine', isAuth, checkPermission(PERMISSIONS.ROUTINES_VIEW_OWN), validator.mine, validateFields, controller.mine)

// Seguimiento personal de la jugadora: progreso y objetivos
router.get('/progress/mine', ...trackOwn, validator.progress, validateFields, controller.myProgress)
router.get('/goals/mine', ...trackOwn, validator.goals, validateFields, controller.myGoals)
router.post('/goals', ...trackOwn, validator.createGoal, validateFields, controller.createGoal)
router.put('/goals/:id', ...trackOwn, validator.updateGoal, validateFields, controller.updateGoal)
router.patch('/goals/:id/state', ...trackOwn, validator.goalState, validateFields, controller.setGoalState)

// Seguimiento de las jugadoras (preparadora física)
router.get('/tracking', ...viewTracking, validator.tracking, validateFields, controller.tracking)
router.get('/tracking/members/:memberId', ...viewTracking, validator.memberTracking, validateFields, controller.memberTracking)

// Preparadora física (carga) y entrenadora (consulta)
router.get('/categories', ...view, controller.categories)
router.get('/weeks', ...view, validator.weeks, validateFields, controller.weeks)
router.get('/', ...view, validator.week, validateFields, controller.week)

router.post('/', ...manage, image, validator.create, validateFields, controller.create)
router.put('/:id', ...manage, image, validator.update, validateFields, controller.update)
router.delete('/:id', ...manage, validator.remove, validateFields, controller.remove)

// Registro de cumplimiento de la rutina de un día (crea o edita)
router.put('/:id/log', ...trackOwn, validator.log, validateFields, controller.saveLog)

module.exports = router
