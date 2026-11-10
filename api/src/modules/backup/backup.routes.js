// Módulo backup: copias de seguridad y restauración por club.
// Cada ruta encadena: isAuth → checkPermission('módulo.acción') → reglas del validator → validateFields → controller
const express = require('express')

const isAuth = require('../../middlewares/isAuth')
const checkPermission = require('../../middlewares/checkPermission')
const validateFields = require('../../middlewares/validateFields')
const upload = require('../../middlewares/upload')
const controller = require('./backup.controller')
const validator = require('./backup.validator')
const { PERMISSIONS } = require('../../utils/permissions')
const { backup: m } = require('../../utils/messages')

const router = express.Router()

const manage = [isAuth, checkPermission(PERMISSIONS.BACKUP_MANAGE)]

// Backup subido para restaurar: .json de hasta 20 MB, en memoria (no se guarda en uploads/)
const backupFile = upload.memory({ field: 'file', maxSize: 20 * 1024 * 1024, extensions: ['.json'], invalidMessage: m.fileType, tooLargeMessage: m.fileTooLarge })

router.get('/', ...manage, controller.list)
router.post('/', ...manage, controller.create)
router.post('/restore-file', ...manage, backupFile, validator.restoreFile, validateFields, controller.restoreFile)
router.get('/:fileName/download', ...manage, validator.download, validateFields, controller.download)
router.post('/:fileName/restore', ...manage, validator.restore, validateFields, controller.restore)

module.exports = router
