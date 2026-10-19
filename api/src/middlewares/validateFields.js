const { validationResult } = require('express-validator')
const { general } = require('../utils/messages')

// Corta con 400 si alguna regla del validator falló. `message` es un resumen general y `errors` trae el detalle por campo.
module.exports = (req, res, next) => {
    const errors = validationResult(req)

    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: general.validationError,
            errors: errors.array({ onlyFirstError: true }).map(err => ({ field: err.path, message: err.msg }))
        })
    }

    next()
}
