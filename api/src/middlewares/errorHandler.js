const { app } = require('../config')
const { general, upload } = require('../utils/messages')

module.exports = (err, req, res, next) => {
    let status = err.status || 500
    let message = err.message

    if (err.name === 'MulterError') {   // Errores de multer (ej. archivo más grande que el máximo)
        status = 400
        message = err.code === 'LIMIT_FILE_SIZE' ? upload.tooLarge : upload.failed
    }

    if (err.type === 'entity.parse.failed') {   // El body no es un JSON válido
        message = general.invalidJson
    }

    if (status >= 500) {
        console.error('Error no capturado:', err)
        if (app.isProd) message = general.serverError
    }

    res.status(status).json({
        success: false,
        code: err.name === 'MulterError' ? undefined : err.code,
        message
    })
}
