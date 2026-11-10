// Service de backup: copias de seguridad y restauración por club.
// Lógica de negocio y acceso a modelos. Filtra siempre por el clubId del usuario logueado (nunca el del body),
// registra las acciones relevantes en la bitácora (utils/logger) y lanza los errores con createError (utils/errors).
//
// El backup es un JSON con las filas del club (readClubRows de utils/clubData.js) y un meta con un checksum SHA-256 de
// los datos, para detectar un archivo modificado. Sin la bitácora, los catálogos compartidos ni los archivos subidos.
//
// SEGURIDAD: el archivo tiene las contraseñas hasheadas y los teléfonos cifrados, así que solo lo descarga quien tiene
// backup.manage. En Render el disco se borra en cada reinicio: en la demo, lo seguro es descargar los backups.
//
// RESTAURACIÓN: es la segunda excepción a la regla de escribir datos solo con los modelos (la primera es db:restore):
// inserta con queryInterface (insertClubRows) para dejar los datos tal cual estaban, con sus ids, el teléfono cifrado y
// los dvh. Los archivos subidos (imágenes y comprobantes) no se restauran: si una imagen se borró después del backup,
// el link queda roto. Las sesiones abiertas siguen, pero isAuth vuelve a leer el estado de cada usuario en cada request.
const crypto = require('crypto')
const fs = require('fs/promises')
const path = require('path')

const sequelize = require('../../config/db')
const { Club, User, Sport, Permission } = require('../../models')
const { updateTableDVV } = require('../../models/integrityHooks')
const { invalidateIntegrityCache, refreshStatus } = require('../integrity/integrity.service')

const logger = require('../../utils/logger')
const { createError } = require('../../utils/errors')
const { CLUB_TABLES, readClubRows, deleteClubRows, insertClubRows } = require('../../utils/clubData')
const { fileStamp } = require('../../utils/csv')
const { BACKUP_TYPES, BACKUP_KEEP_LAST, USER_STATES, TABLE_LABELS, LOG_ACTIONS } = require('../../utils/constants')
const { PERMISSIONS } = require('../../utils/permissions')
const { backup: m } = require('../../utils/messages')

const BACKUPS_DIR = path.join(__dirname, '../../../backups')
const APP_NAME = 'Club360'
const FORMAT_VERSION = 1

// Nombre de un archivo de backup. Los nombres que llegan del cliente se validan con esta regex y se buscan solo en la
// carpeta del club del usuario: nunca se arma una ruta con lo que manda el cliente
const FILE_NAME = /^backup-\d{8}-\d{6}-(manual|auto|pre_restore)\.json$/

const SYSTEM = (clubId) => ({ clubId, userId: null, roleId: null })
const actorOf = ({ id: userId, clubId, activeRoleId }) => ({ clubId, userId, roleId: activeRoleId })

const clubDir = (clubId) => path.join(BACKUPS_DIR, `club-${Number(clubId)}`)

const checksumOf = (data) => crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex')

const countRows = (data) => Object.fromEntries(Object.entries(data).map(([table, rows]) => [table, rows.length]))
const totalOf = (tables) => Object.values(tables).reduce((sum, count) => sum + count, 0)

// Ruta de un backup del club, o 404 si el nombre no es válido o no existe
async function resolveBackupFile(clubId, fileName) {
    if (!FILE_NAME.test(String(fileName))) throw createError(m.fileNameInvalid, 400)
    const filePath = path.join(clubDir(clubId), fileName)
    try {
        await fs.access(filePath)
    } catch {
        throw createError(m.notFound, 404)
    }
    return filePath
}

// ---------- Generar ----------

// Borra los backups más viejos del club: quedan los últimos BACKUP_KEEP_LAST (de todos los tipos). keep: uno que no se
// borra aunque sea viejo (el que se está restaurando)
async function prune(clubId, keep = null) {
    const files = (await fs.readdir(clubDir(clubId))).filter(name => FILE_NAME.test(name)).sort().reverse()
    for (const name of files.slice(BACKUP_KEEP_LAST)) {
        if (name !== keep) await fs.unlink(path.join(clubDir(clubId), name))
    }
}

// Genera y guarda un backup del club. createdBy: { id, username } o null (el job). Devuelve el resumen
async function createBackupFile(clubId, type, createdBy, { keep = null } = {}) {
    const club = await Club.findByPk(clubId, { attributes: ['id', 'name'] })
    const data = await readClubRows(clubId)
    const tables = countRows(data)

    await fs.mkdir(clubDir(clubId), { recursive: true })
    const now = new Date()
    let fileName = `backup-${fileStamp(now).seconds}-${type.toLowerCase()}.json`
    // Dos backups en el mismo segundo (por ejemplo, el previo a restaurar justo después de uno manual): se corre un segundo
    for (let offset = 1; await fs.access(path.join(clubDir(clubId), fileName)).then(() => true, () => false); offset++) {
        fileName = `backup-${fileStamp(new Date(now.getTime() + offset * 1000)).seconds}-${type.toLowerCase()}.json`
    }

    const meta = {
        app: APP_NAME,
        formatVersion: FORMAT_VERSION,
        clubId: club.id,
        clubName: club.name,
        type,
        createdAt: now.toISOString(),
        createdBy,
        tables,
        checksum: checksumOf(data)
    }

    await fs.writeFile(path.join(clubDir(clubId), fileName), JSON.stringify({ meta, data }))
    await prune(clubId, keep)

    return { fileName, ...summaryOf(meta), size: (await fs.stat(path.join(clubDir(clubId), fileName))).size }
}

const summaryOf = (meta) => ({
    createdAt: meta.createdAt,
    type: meta.type,
    totalRows: totalOf(meta.tables ?? {}),
    tables: meta.tables,
    createdBy: meta.createdBy ?? null
})

// Backup manual (backup.manage)
async function createManualBackup(actor) {
    const user = await User.findByPk(actor.id, { attributes: ['id', 'username'] })
    const backup = await createBackupFile(actor.clubId, BACKUP_TYPES.MANUAL, { id: user.id, username: user.username })
    await logger(actorOf(actor), LOG_ACTIONS.BACKUP_CREATED, `Backup manual ${backup.fileName}: ${backup.totalRows} filas`)
    return backup
}

// Job backup (domingos a las 03:00): un backup AUTO de cada club. Si falla uno, se registra y sigue con el siguiente
async function runAutoBackups(today = new Date()) {
    const clubs = await Club.findAll({ attributes: ['id'], raw: true })
    const results = []
    for (const { id } of clubs) {
        try {
            const backup = await createBackupFile(id, BACKUP_TYPES.AUTO, null)
            await logger(SYSTEM(id), LOG_ACTIONS.BACKUP_CREATED, `Backup automático ${backup.fileName}: ${backup.totalRows} filas`)
            results.push({ clubId: id, fileName: backup.fileName })
        } catch (error) {
            await logger(SYSTEM(id), LOG_ACTIONS.BACKUP_AUTO_FAILED, `No se pudo generar el backup automático: ${error.message}`)
            results.push({ clubId: id, error: error.message })
        }
    }
    return { date: today, results }
}

// ---------- Listar y descargar ----------

// Backups guardados del club, del más nuevo al más viejo, con lo que dice su meta
async function listBackups(user) {
    let files = []
    try {
        files = (await fs.readdir(clubDir(user.clubId))).filter(name => FILE_NAME.test(name)).sort().reverse()
    } catch {
        return { items: [] }
    }

    const items = []
    for (const fileName of files) {
        const filePath = path.join(clubDir(user.clubId), fileName)
        const [stat, content] = await Promise.all([fs.stat(filePath), fs.readFile(filePath, 'utf8')])
        try {
            const { meta } = JSON.parse(content)
            items.push({ fileName, size: stat.size, ...summaryOf(meta) })
        } catch {
            items.push({ fileName, size: stat.size, createdAt: stat.mtime, type: null, totalRows: null, tables: null, createdBy: null, damaged: true })
        }
    }
    return { items }
}

// Descarga (backup.manage): devuelve la ruta para enviar el archivo y lo registra
async function getBackupForDownload(actor, fileName) {
    const filePath = await resolveBackupFile(actor.clubId, fileName)
    await logger(actorOf(actor), LOG_ACTIONS.BACKUP_DOWNLOADED, `Backup ${fileName}`)
    return { filePath, fileName }
}

// ---------- Restaurar ----------

// Validaciones del archivo antes de tocar nada. Devuelve { meta, data } o lanza 400 con el motivo
async function validateBackup(actor, content) {
    let parsed
    try {
        parsed = JSON.parse(content)
    } catch {
        throw createError(m.invalidFormat, 400)
    }

    const { meta, data } = parsed ?? {}
    // 1. Formato
    if (!meta || meta.app !== APP_NAME || meta.formatVersion !== FORMAT_VERSION || !data || typeof data !== 'object') {
        throw createError(m.invalidFormat, 400)
    }
    for (const { Model } of CLUB_TABLES) {
        if (!Array.isArray(data[Model.getTableName()])) throw createError(m.invalidFormat, 400)
    }

    // 2. Club: el del Admin, y todas las filas con clubId son de ese club
    const clubId = actor.clubId
    const otherClubRow = CLUB_TABLES.some(({ Model, by }) => by === 'clubId' && data[Model.getTableName()].some(row => row.clubId !== clubId))
    if (meta.clubId !== clubId || data.club.length !== 1 || data.club[0].id !== clubId || otherClubRow) {
        throw createError(m.otherClub, 400)
    }

    // 3. Integridad del archivo
    if (meta.checksum !== checksumOf(data)) throw createError(m.checksumMismatch, 400)

    // 4. Catálogos: los deportes y los permisos a los que apunta el backup existen en la base
    const [sports, permissions] = await Promise.all([
        Sport.findAll({ attributes: ['id'], raw: true }),
        Permission.findAll({ attributes: ['id', 'name'], raw: true })
    ])
    const sportIds = new Set(sports.map(sport => sport.id))
    const permissionIds = new Set(permissions.map(permission => permission.id))
    const missingCatalog = data.clubSport.some(row => !sportIds.has(row.sportId))
        || [...data.role_permission, ...data.user_permission].some(row => !permissionIds.has(row.permissionId))
    if (missingCatalog) throw createError(m.missingCatalogs, 400)

    // 5. Quien restaura está en el backup, ACTIVE y con backup.manage (por alguno de sus roles o directo)
    const backupManage = permissions.find(permission => permission.name === PERMISSIONS.BACKUP_MANAGE)?.id
    const restorer = data.user.find(row => row.id === actor.id)
    const roleIds = new Set(data.user_role.filter(row => row.userId === actor.id).map(row => row.roleId))
    const canRestore = Boolean(restorer) && restorer.userStateId === USER_STATES.ACTIVE && (
        data.role_permission.some(row => roleIds.has(row.roleId) && row.permissionId === backupManage)
        || data.user_permission.some(row => row.userId === actor.id && row.permissionId === backupManage)
    )
    if (!canRestore) throw createError(m.restorerMissing, 400)

    return { meta, data }
}

// Restaura un backup del club. source: { fileName } (uno de la lista) o { buffer, originalName } (un archivo subido).
// Valida todo antes de tocar nada; guarda un backup PRE_RESTORE; reemplaza las filas del club en una sola transacción
// (si algo falla, se deshace y el club queda como estaba); recalcula el DVV y verifica la integridad sin caché
async function restoreBackup(actor, source) {
    const label = source.fileName ?? `archivo subido ${source.originalName ?? ''}`.trim()

    let meta
    let data
    try {
        const content = source.fileName
            ? await fs.readFile(await resolveBackupFile(actor.clubId, source.fileName), 'utf8')
            : source.buffer.toString('utf8')
        ;({ meta, data } = await validateBackup(actor, content))
    } catch (error) {
        await logger(actorOf(actor), LOG_ACTIONS.BACKUP_RESTORE_FAILED, `${label}: ${error.message}`)
        throw error
    }

    // Backup del estado actual, para poder deshacer la restauración
    const user = await User.findByPk(actor.id, { attributes: ['id', 'username'] })
    const preRestore = await createBackupFile(actor.clubId, BACKUP_TYPES.PRE_RESTORE, { id: user.id, username: user.username }, { keep: source.fileName })

    let rows
    try {
        rows = await sequelize.transaction(async (transaction) => {
            await deleteClubRows(actor.clubId, { transaction })
            const inserted = await insertClubRows(data, { transaction })

            // El DVV es de la tabla completa: se recalcula el de todas las tablas tocadas, en la misma transacción
            for (const { Model } of CLUB_TABLES) {
                if (Model.rawAttributes.dvh) await updateTableDVV(Model, transaction)
            }
            return inserted
        })
    } catch (error) {
        await logger(actorOf(actor), LOG_ACTIONS.BACKUP_RESTORE_FAILED,
            `${label}: falló al reemplazar los datos (${error.message}). Se deshizo todo; backup previo: ${preRestore.fileName}`)
        throw createError(m.restoreFailed, 500)
    }

    invalidateIntegrityCache()
    const verification = await refreshStatus(actor.clubId)

    const tables = Object.entries(rows).map(([table, count]) => `${TABLE_LABELS[table] ?? table}: ${count}`).join(', ')
    await logger(actorOf(actor), LOG_ACTIONS.BACKUP_RESTORED,
        `${label} (del ${meta.createdAt}, tipo ${meta.type}). Filas: ${tables}. Backup previo: ${preRestore.fileName}. Estado: ${verification.status}`)

    return {
        restored: { fileName: source.fileName ?? null, createdAt: meta.createdAt, type: meta.type },
        preRestore: preRestore.fileName,
        rows,
        verification: { status: verification.status, checkedAt: verification.checkedAt, alteredRows: verification.alteredRows }
    }
}

module.exports = {
    FILE_NAME,
    createBackupFile,
    createManualBackup,
    runAutoBackups,
    listBackups,
    getBackupForDownload,
    restoreBackup
}
