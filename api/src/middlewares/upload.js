// PENDIENTE: en Render el disco no es persistente, definir solución antes del deploy
const multer = require('multer')
const path = require('path')
const fs = require('fs')

const { createError } = require('../utils/errors')
const { upload: messages } = require('../utils/messages')
const { UPLOADS_DIR, UPLOAD_FOLDERS } = require('../utils/files')

const ALLOWED_TYPES = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' }
const MAX_SIZE = 5 * 1024 * 1024   // 5 MB

// Carpetas con otros tipos permitidos. Los comprobantes de transferencias aceptan también PDF (y no WEBP)
// PENDIENTE (P17, Cloudinary): los comprobantes van como recurso `raw` y privados (type: 'private' o 'authenticated'),
// nunca con una URL pública; se descargan solo con GET /fees/payments/:id/receipt-file
const FOLDER_TYPES = {
    [UPLOAD_FOLDERS.RECEIPTS]: {
        types: { 'image/jpeg': '.jpg', 'image/png': '.png', 'application/pdf': '.pdf' },
        invalidMessage: messages.invalidReceiptType
    }
}

// Uso: upload('routines').single('image')
const upload = (folder) => {
    const destination = path.join(UPLOADS_DIR, folder)
    const { types: allowedTypes, invalidMessage } = FOLDER_TYPES[folder] ?? { types: ALLOWED_TYPES, invalidMessage: messages.invalidType }

    const storage = multer.diskStorage({
        destination: (req, file, cb) => {
            fs.mkdirSync(destination, { recursive: true })   // Crea la carpeta si no existe
            cb(null, destination)
        },

        filename: (req, file, cb) => {
            const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`
            cb(null, unique + allowedTypes[file.mimetype])
        }
    })

    const fileFilter = (req, file, cb) => {
        if (!allowedTypes[file.mimetype]) {
            return cb(createError(invalidMessage, 400))
        }

        cb(null, true)
    }

    return multer({ storage, fileFilter, limits: { fileSize: MAX_SIZE } })
}

// Archivo en memoria (no se guarda en uploads/): queda en req.file.buffer. Lo usa la restauración de un backup subido.
// Uso: upload.memory({ field: 'file', maxSize, extensions: ['.json'], invalidMessage, tooLargeMessage })
upload.memory = ({ field, maxSize, extensions, invalidMessage, tooLargeMessage }) => {
    const middleware = multer({
        storage: multer.memoryStorage(),
        limits: { fileSize: maxSize, files: 1 },
        fileFilter: (req, file, cb) => {
            if (!extensions.includes(path.extname(file.originalname).toLowerCase())) return cb(createError(invalidMessage, 400))
            cb(null, true)
        }
    }).single(field)

    // El tamaño máximo de este archivo no es el de las imágenes: el error de multer se traduce con su propio mensaje
    return (req, res, next) => middleware(req, res, (error) => {
        if (error?.code === 'LIMIT_FILE_SIZE') return next(createError(tooLargeMessage, 400))
        next(error)
    })
}

module.exports = upload
