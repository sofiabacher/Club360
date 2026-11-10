// Controller de backup.
// Lee req (params, query, body, user), llama al service y responde { success: true, data } o { success: false, message }.
// Sin lógica de negocio ni acceso a modelos. Los errores se pasan con next(error).
const service = require('./backup.service')
const { createError } = require('../../utils/errors')
const { backup: m } = require('../../utils/messages')

const list = async (req, res, next) => {
    try {
        const data = await service.listBackups(req.user)
        res.json({ success: true, data })

    } catch (error) {
        next(error)
    }
}

const create = async (req, res, next) => {
    try {
        const data = await service.createManualBackup(req.user)
        res.status(201).json({ success: true, data })

    } catch (error) {
        next(error)
    }
}

// Descarga el archivo .json (solo con backup.manage: tiene contraseñas hasheadas y teléfonos cifrados)
const download = async (req, res, next) => {
    try {
        const { filePath, fileName } = await service.getBackupForDownload(req.user, req.params.fileName)
        res.download(filePath, fileName, (error) => { if (error && !res.headersSent) next(error) })

    } catch (error) {
        next(error)
    }
}

const restore = async (req, res, next) => {
    try {
        const data = await service.restoreBackup(req.user, { fileName: req.params.fileName })
        res.json({ success: true, data })

    } catch (error) {
        next(error)
    }
}

// El archivo llega en memoria (req.file.buffer, middleware upload.memory)
const restoreFile = async (req, res, next) => {
    try {
        if (!req.file) throw createError(m.fileRequired, 400)
        const data = await service.restoreBackup(req.user, { buffer: req.file.buffer, originalName: req.file.originalname })
        res.json({ success: true, data })

    } catch (error) {
        next(error)
    }
}

module.exports = {
    list,
    create,
    download,
    restore,
    restoreFile
}
