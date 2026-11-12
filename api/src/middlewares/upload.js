// Subida de archivos con multer. Según el entorno (decisión D7):
//   - desarrollo: disco, en uploads/<carpeta>/;
//   - producción: Cloudinary, en club360/<carpeta> (el disco de Render no es persistente). Sin las variables CLOUDINARY_*,
//     las subidas responden 503.
// En los dos casos deja en req.file.url lo que el service guarda en la base: la ruta /uploads/... o la secure_url.
// Las imágenes van a Cloudinary como públicas; los comprobantes (carpeta receipts), como recurso raw privado
// (type: 'private'), que solo se descarga con un link firmado desde GET /fees/payments/:id/receipt-file.
const multer = require('multer')
const path = require('path')
const fs = require('fs')

const cloudinary = require('../config/cloudinary')
const { app, cloudinary: cloudinaryConfig } = require('../config')
const { createError } = require('../utils/errors')
const { upload: messages } = require('../utils/messages')
const { UPLOADS_DIR, UPLOAD_FOLDERS, CLOUD_FOLDER, PRIVATE_UPLOAD_FOLDERS, toPublicPath, discardUploadedFile } = require('../utils/files')

const ALLOWED_TYPES = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' }
const MAX_SIZE = 5 * 1024 * 1024   // 5 MB

// Primeros bytes de cada tipo de comprobante: el tipo que declara el navegador no alcanza para confiar en el archivo
const RECEIPT_SIGNATURES = {
    '.jpg': Buffer.from([0xFF, 0xD8, 0xFF]),
    '.png': Buffer.from([0x89, 0x50, 0x4E, 0x47]),
    '.pdf': Buffer.from('%PDF')
}

// Carpetas con otros tipos permitidos. Los comprobantes de transferencias aceptan también PDF (y no WEBP), y se revisan
// sus primeros bytes antes de guardarlos
const FOLDER_TYPES = {
    [UPLOAD_FOLDERS.RECEIPTS]: {
        types: { 'image/jpeg': '.jpg', 'image/png': '.png', 'application/pdf': '.pdf' },
        invalidMessage: messages.invalidReceiptType,
        signatures: RECEIPT_SIGNATURES
    }
}

const uniqueName = () => `${Date.now()}-${Math.round(Math.random() * 1e9)}`

// Primeros bytes del archivo subido (en memoria o en el disco)
function headOf(file, length) {
    if (file.buffer) return file.buffer.subarray(0, length)

    const head = Buffer.alloc(length)
    const handle = fs.openSync(file.path, 'r')
    try {
        const bytesRead = fs.readSync(handle, head, 0, length, 0)
        return head.subarray(0, bytesRead)
    } finally {
        fs.closeSync(handle)
    }
}

// Sube el buffer a Cloudinary. Los raw guardan la extensión en el public_id (si no, se descargan sin ella)
function uploadToCloudinary(file, folder, extension) {
    const isPrivate = PRIVATE_UPLOAD_FOLDERS.includes(folder)
    const options = {
        folder: `${CLOUD_FOLDER}/${folder}`,
        public_id: isPrivate ? `${uniqueName()}${extension}` : uniqueName(),
        resource_type: isPrivate ? 'raw' : 'image',
        type: isPrivate ? 'private' : 'upload'
    }

    return new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(options, (error, result) => (error ? reject(error) : resolve(result))).end(file.buffer)
    })
}

// Uso: upload('routines').single('image'). El archivo es opcional: sin archivo, req.file queda vacío
const upload = (folder) => {
    const { types: allowedTypes, invalidMessage, signatures } = FOLDER_TYPES[folder] ?? { types: ALLOWED_TYPES, invalidMessage: messages.invalidType }
    const destination = path.join(UPLOADS_DIR, folder)

    const fileFilter = (req, file, cb) => {
        if (!allowedTypes[file.mimetype]) return cb(createError(invalidMessage, 400))
        cb(null, true)
    }

    const diskStorage = multer.diskStorage({
        destination: (req, file, cb) => {
            fs.mkdirSync(destination, { recursive: true })   // Crea la carpeta si no existe
            cb(null, destination)
        },

        filename: (req, file, cb) => cb(null, uniqueName() + allowedTypes[file.mimetype])
    })

    // Revisa los primeros bytes (en las carpetas que lo piden) y deja req.file.url
    const afterMulter = async (req, field) => {
        if (!req.file) return
        const extension = allowedTypes[req.file.mimetype]

        const signature = signatures?.[extension]
        if (signature && !headOf(req.file, signature.length).equals(signature)) {
            await discardUploadedFile(req.file)
            throw createError(invalidMessage, 400)
        }

        if (req.file.buffer) {   // Producción: a Cloudinary
            try {
                const result = await uploadToCloudinary(req.file, folder, extension)
                req.file.url = result.secure_url
            } catch (error) {
                console.error(`No se pudo subir el archivo (${field}) a Cloudinary:`, error.message ?? error.error?.message)
                throw createError(messages.unavailable, 503)
            }
            return
        }

        req.file.url = toPublicPath(folder, req.file.filename)   // Desarrollo: disco
    }

    return {
        single: (field) => {
            const useCloudinary = app.isProd

            // Producción sin Cloudinary: no se sube nada (el disco de Render se borra en cada reinicio)
            if (useCloudinary && !cloudinaryConfig.isConfigured) {
                return (req, res, next) => next(createError(messages.unavailable, 503))
            }

            const storage = useCloudinary ? multer.memoryStorage() : diskStorage
            const middleware = multer({ storage, fileFilter, limits: { fileSize: MAX_SIZE } }).single(field)

            return (req, res, next) => middleware(req, res, async (error) => {
                if (error) return next(error)

                try {
                    await afterMulter(req, field)
                    next()
                } catch (uploadError) {
                    next(uploadError)
                }
            })
        }
    }
}

// Archivo en memoria (no se guarda en uploads/ ni en Cloudinary): queda en req.file.buffer. Lo usa la restauración de
// un backup subido. Uso: upload.memory({ field: 'file', maxSize, extensions: ['.json'], invalidMessage, tooLargeMessage })
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
