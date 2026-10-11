// PENDIENTE: en Render el disco no es persistente, definir solución antes del deploy
const multer = require('multer')
const path = require('path')
const fs = require('fs')

const { createError } = require('../utils/errors')
const { upload: messages } = require('../utils/messages')

const UPLOADS_DIR = path.join(__dirname, '../../uploads')
const ALLOWED_TYPES = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' }
const MAX_SIZE = 5 * 1024 * 1024   // 5 MB

// Uso: upload('routines').single('image')
const upload = (folder) => {
    const destination = path.join(UPLOADS_DIR, folder)

    const storage = multer.diskStorage({
        destination: (req, file, cb) => {
            fs.mkdirSync(destination, { recursive: true })   // Crea la carpeta si no existe
            cb(null, destination)
        },

        filename: (req, file, cb) => {
            const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`
            cb(null, unique + ALLOWED_TYPES[file.mimetype])
        }
    })

    const fileFilter = (req, file, cb) => {
        if (!ALLOWED_TYPES[file.mimetype]) {
            return cb(createError(messages.invalidType, 400))
        }

        cb(null, true)
    }

    return multer({ storage, fileFilter, limits: { fileSize: MAX_SIZE } })
}

module.exports = upload
