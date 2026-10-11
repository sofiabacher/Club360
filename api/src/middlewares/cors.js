const { cors } = require('../config')

const allowedOrigins = [...new Set([cors.origin, 'http://localhost:5173'])]

module.exports = (req, res, next) => {
    const origin = req.headers.origin

    if (allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin)
        res.setHeader('Vary', 'Origin')
    }

    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')   // Métodos HTTP permitidos
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')   // JSON en el body y token de sesión
    res.setHeader('Access-Control-Allow-Credentials', 'true')
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin')   // Permite al front mostrar las imágenes de /uploads

    if (req.method === 'OPTIONS') {   // Preflight: se responde OK para que la petición real continúe
        return res.sendStatus(200)
    }

    next()
}
