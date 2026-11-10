// Validator de backup.
// Reglas de express-validator: solo el formato de los datos, no reglas de negocio.
// Que el archivo sea un backup válido de este club lo controla el service.
const { body, param } = require('express-validator')
const { backup: m } = require('../../utils/messages')

// El mismo patrón que FILE_NAME del service: sin barras ni '..', solo nombres de backup
const FILE_NAME = /^backup-\d{8}-\d{6}-(manual|auto|pre_restore)\.json$/

const CONFIRM_WORD = 'RESTAURAR'

const fileNameParam = param('fileName').matches(FILE_NAME).withMessage(m.fileNameInvalid)
const confirm = body('confirm').equals(CONFIRM_WORD).withMessage(m.confirmRequired)

const download = [fileNameParam]

const restore = [fileNameParam, confirm]

// multipart: el archivo lo controla el middleware upload.memory; el confirm viene en el form
const restoreFile = [confirm]

module.exports = {
    download,
    restore,
    restoreFile
}
