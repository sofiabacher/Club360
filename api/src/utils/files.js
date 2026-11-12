// Archivos subidos con multer (middlewares/upload.js). Según el entorno, quedan en:
//   - desarrollo: api/uploads/<carpeta>/, y se guarda en la base la ruta /uploads/<carpeta>/<archivo>. Se sirven en
//     /uploads, salvo las carpetas privadas (PRIVATE_UPLOAD_FOLDERS);
//   - producción: Cloudinary, en club360/<carpeta>, y se guarda la secure_url (el disco de Render no es persistente).
// Los services no saben dónde quedó: guardan req.file.url y, para borrar, llaman a deleteUpload con lo guardado.
const path = require('path')
const fs = require('fs/promises')

const cloudinary = require('../config/cloudinary')

const UPLOADS_DIR = path.join(__dirname, '../../uploads')
const PUBLIC_PREFIX = '/uploads/'
const CLOUD_FOLDER = 'club360'

// Carpetas dentro de uploads/ (y de club360/ en Cloudinary). Uso: upload(UPLOAD_FOLDERS.AVATARS).single('photo')
const UPLOAD_FOLDERS = {
    AVATARS: 'avatars',
    ROUTINES: 'routines',
    RECEIPTS: 'receipts'   // Comprobantes de transferencias: NO son públicos (ver PRIVATE_UPLOAD_FOLDERS)
}

// Carpetas que no se sirven por /uploads: sus archivos se descargan con un endpoint que exige sesión y permiso
// (los comprobantes, con GET /fees/payments/:id/receipt-file). Lo controla isPrivateUploadPath, en app.js.
// En Cloudinary van como recurso raw privado (type: 'private'): la secure_url sola no los abre
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

// Datos de un archivo de Cloudinary a partir de su URL, o null si no es una URL de Cloudinary:
// https://res.cloudinary.com/<cloud>/<resource_type>/<type>/v123/club360/<carpeta>/<archivo>
// public_id va sin la versión; en las imágenes, sin la extensión, y en los raw, con la extensión (así los guarda Cloudinary)
const CLOUDINARY_URL = /^https:\/\/res\.cloudinary\.com\/[^/]+\/(image|raw)\/(upload|private|authenticated)\/(?:v\d+\/)?(.+)$/

function cloudinaryRefOf(url) {
    const match = CLOUDINARY_URL.exec(url ?? '')
    if (!match) return null

    const [, resourceType, type, rest] = match
    const file = decodeURIComponent(rest)
    const publicId = resourceType === 'raw' ? file : file.replace(/\.[^./]+$/, '')
    return { resourceType, type, publicId, extension: path.extname(file).toLowerCase() }
}

const isCloudinaryUrl = (url) => cloudinaryRefOf(url) !== null

// Borra un archivo subido a partir de lo que se guardó en la base, esté donde esté:
//   - ruta local (/uploads/...): del disco, solo dentro de uploads/; si ya no existe, no hace nada;
//   - URL de Cloudinary: con uploader.destroy.
// Un error al borrar se muestra por consola y no corta la operación. Es la única función que borra archivos subidos
async function deleteUpload(stored) {
    if (!stored) return

    const ref = cloudinaryRefOf(stored)
    if (ref) {
        try {
            await cloudinary.uploader.destroy(ref.publicId, { resource_type: ref.resourceType, type: ref.type, invalidate: true })
        } catch (error) {
            console.error('No se pudo borrar el archivo de Cloudinary:', error.message ?? error.error?.message)
        }
        return
    }

    const filePath = resolveUploadPath(stored)   // Evita rutas que se salgan de uploads/ (por ejemplo, con ..)
    if (!filePath) return

    try {
        await fs.unlink(filePath)
    } catch (error) {
        if (error.code !== 'ENOENT') console.error('No se pudo borrar el archivo subido:', error.message)
    }
}

// Borra el archivo que acaba de subir el middleware (req.file) cuando la request no sigue (por ejemplo, datos inválidos)
async function discardUploadedFile(file) {
    if (!file) return
    if (file.url) return deleteUpload(file.url)
    if (!file.path) return

    const filePath = path.resolve(file.path)
    if (!filePath.startsWith(UPLOADS_DIR + path.sep)) return

    try {
        await fs.unlink(filePath)
    } catch (error) {
        if (error.code !== 'ENOENT') console.error('No se pudo borrar el archivo subido:', error.message)
    }
}

const PRIVATE_LINK_SECONDS = 60
const DOWNLOAD_TIMEOUT_MS = 15000

// Contenido de un archivo privado de Cloudinary (un comprobante). Genera un link firmado que vence en unos 60 segundos,
// lo descarga desde el back y devuelve el Buffer: el link nunca sale al navegador. null si Cloudinary responde error
async function downloadPrivateFile(url) {
    const ref = cloudinaryRefOf(url)
    if (!ref) return null

    try {
        const link = cloudinary.utils.private_download_url(ref.publicId, '', {
            resource_type: ref.resourceType,
            type: ref.type,
            expires_at: Math.floor(Date.now() / 1000) + PRIVATE_LINK_SECONDS
        })

        const response = await fetch(link, { signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS) })
        if (!response.ok) return null
        return Buffer.from(await response.arrayBuffer())

    } catch (error) {
        console.error('No se pudo descargar el archivo de Cloudinary:', error.message)
        return null
    }
}

module.exports = {
    UPLOADS_DIR,
    CLOUD_FOLDER,
    UPLOAD_FOLDERS,
    PRIVATE_UPLOAD_FOLDERS,
    toPublicPath,
    isPrivateUploadPath,
    resolveUploadPath,
    cloudinaryRefOf,
    isCloudinaryUrl,
    deleteUpload,
    discardUploadedFile,
    downloadPrivateFile
}
