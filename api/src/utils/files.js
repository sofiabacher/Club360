// Archivos subidos con multer (middlewares/upload.js). Se guardan en api/uploads/<carpeta>/ y se sirven en /uploads.
// PENDIENTE: en Render el disco no es persistente (decisión D7).
const path = require('path')
const fs = require('fs/promises')

const UPLOADS_DIR = path.join(__dirname, '../../uploads')
const PUBLIC_PREFIX = '/uploads/'

// Carpetas dentro de uploads/. Uso: upload(UPLOAD_FOLDERS.AVATARS).single('photo')
const UPLOAD_FOLDERS = {
    AVATARS: 'avatars'
}

// Ruta pública que se guarda en la base: /uploads/<carpeta>/<archivo>
const toPublicPath = (folder, filename) => `${PUBLIC_PREFIX}${folder}/${filename}`

// Borra del disco un archivo a partir de su ruta pública. Solo borra dentro de uploads/; si no existe, no hace nada
async function deleteUpload(publicPath) {
    if (!publicPath || !publicPath.startsWith(PUBLIC_PREFIX)) return

    const filePath = path.resolve(UPLOADS_DIR, publicPath.slice(PUBLIC_PREFIX.length))
    if (!filePath.startsWith(UPLOADS_DIR + path.sep)) return   // Evita rutas que se salgan de uploads/ (por ejemplo, con ..)

    try {
        await fs.unlink(filePath)
    } catch (error) {
        if (error.code !== 'ENOENT') console.error('No se pudo borrar el archivo subido:', error.message)
    }
}

module.exports = {
    UPLOADS_DIR,
    UPLOAD_FOLDERS,
    toPublicPath,
    deleteUpload
}
