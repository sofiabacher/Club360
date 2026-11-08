// Módulo routines: rutinas semanales.
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
const image = upload(UPLOAD_FOLDERS.ROUTINES).single('image')

// Jugadora (va antes de /:id)
router.get('/mine', isAuth, checkPermission(PERMISSIONS.ROUTINES_VIEW_OWN), validator.mine, validateFields, controller.mine)

// Preparadora física (carga) y entrenadora (consulta)
router.get('/categories', ...view, controller.categories)
router.get('/weeks', ...view, validator.weeks, validateFields, controller.weeks)
router.get('/', ...view, validator.week, validateFields, controller.week)

router.post('/', ...manage, image, validator.create, validateFields, controller.create)
router.put('/:id', ...manage, image, validator.update, validateFields, controller.update)
router.delete('/:id', ...manage, validator.remove, validateFields, controller.remove)

module.exports = router
