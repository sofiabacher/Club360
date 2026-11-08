// Archivos subidos con multer (middlewares/upload.js). Se guardan en api/uploads/<carpeta>/ y se sirven en /uploads,
// salvo las carpetas privadas (PRIVATE_UPLOAD_FOLDERS).
// PENDIENTE: en Render el disco no es persistente (decisión D7).
const path = require('path')
const fs = require('fs/promises')

const UPLOADS_DIR = path.join(__dirname, '../../uploads')
const PUBLIC_PREFIX = '/uploads/'

// Carpetas dentro de uploads/. Uso: upload(UPLOAD_FOLDERS.AVATARS).single('photo')
const UPLOAD_FOLDERS = {
    AVATARS: 'avatars',
    ROUTINES: 'routines',
    RECEIPTS: 'receipts'   // Comprobantes de transferencias: NO son públicos (ver PRIVATE_UPLOAD_FOLDERS)
}

// Carpetas que no se sirven por /uploads: sus archivos se descargan con un endpoint que exige sesión y permiso
// (los comprobantes, con GET /fees/payments/:id/receipt-file). Lo controla isPrivateUploadPath, en app.js
const PRIVATE_UPLOAD_FOLDERS = [UPLOAD_FOLDERS.RECEIPTS]

// Ruta pública que se guarda en la base: /uploads/<carpeta>/<archivo>
const toPublicPath = (folder, filename) => `${PUBLIC_PREFIX}${folder}/${filename}`

// true si la ruta pedida dentro de /uploads (req.path, por ejemplo '/receipts/123.pdf') cae en una carpeta privada.
// Se decodifica (como lo hace express.static) y se resuelve la ruta antes de comparar, para que no se pueda saltear con
// '%72eceipts', '//receipts', '/./receipts', 'avatars/..%2freceipts', barras invertidas o mayúsculas (en Windows el
// disco no distingue mayúsculas)
function isPrivateUploadPath(requestPath) {
    let decoded
    try {
        decoded = decodeURIComponent(requestPath)
    } catch {
        return true   // Una ruta mal codificada no se sirve
    }

    const resolved = path.posix.normalize(`/${decoded.replaceAll('\\', '/')}`)
    const [folder = ''] = resolved.split('/').filter(Boolean)
    return PRIVATE_UPLOAD_FOLDERS.includes(folder.toLowerCase())
}

// Ruta absoluta en el disco de un archivo a partir de su ruta guardada (/uploads/...), o null si se sale de uploads/
function resolveUploadPath(publicPath) {
    if (!publicPath || !publicPath.startsWith(PUBLIC_PREFIX)) return null

    const filePath = path.resolve(UPLOADS_DIR, publicPath.slice(PUBLIC_PREFIX.length))
    return filePath.startsWith(UPLOADS_DIR + path.sep) ? filePath : null
}

// Borra del disco un archivo a partir de su ruta pública. Solo borra dentro de uploads/; si no existe, no hace nada
async function deleteUpload(publicPath) {
    const filePath = resolveUploadPath(publicPath)   // Evita rutas que se salgan de uploads/ (por ejemplo, con ..)
    if (!filePath) return

    try {
        await fs.unlink(filePath)
    } catch (error) {
        if (error.code !== 'ENOENT') console.error('No se pudo borrar el archivo subido:', error.message)
    }
}

// Borra el archivo que acaba de subir multer (req.file) cuando la request no sigue (por ejemplo, datos inválidos)
async function discardUploadedFile(file) {
    if (!file?.path) return
    const filePath = path.resolve(file.path)
    if (!filePath.startsWith(UPLOADS_DIR + path.sep)) return

    try {
        await fs.unlink(filePath)
    } catch (error) {
        if (error.code !== 'ENOENT') console.error('No se pudo borrar el archivo subido:', error.message)
    }
}

module.exports = {
    UPLOADS_DIR,
    discardUploadedFile,
    UPLOAD_FOLDERS,
    toPublicPath,
    isPrivateUploadPath,
    resolveUploadPath,
    deleteUpload
}
