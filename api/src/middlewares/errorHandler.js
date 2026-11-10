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

    // Los errores propios (createError) con 5xx, como el 503 del bloqueo por integridad, se responden con su mensaje y
    // su código; solo los inesperados se muestran en la consola y, en producción, con un mensaje general
    if (status >= 500 && !err.isOperational) {
        console.error('Error no capturado:', err)
        if (app.isProd) message = general.serverError
    }

    res.status(status).json({
        success: false,
        code: err.name === 'MulterError' ? undefined : err.code,
        message,
        data: err.isOperational ? err.data : undefined
    })
}
