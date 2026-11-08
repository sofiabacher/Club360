const { validationResult } = require('express-validator')
const { general } = require('../utils/messages')
const { discardUploadedFile } = require('../utils/files')

// Corta con 400 si alguna regla del validator falló. `message` es un resumen general y `errors` trae el detalle por campo.
// Si la request trajo un archivo (multer ya lo guardó), se borra: con datos inválidos no queda suelto
module.exports = async (req, res, next) => {
    const errors = validationResult(req)

    if (!errors.isEmpty()) {
        await discardUploadedFile(req.file)
        return res.status(400).json({
            success: false,
            message: general.validationError,
            errors: errors.array({ onlyFirstError: true }).map(err => ({ field: err.path, message: err.msg }))
        })
    }

    next()
}
