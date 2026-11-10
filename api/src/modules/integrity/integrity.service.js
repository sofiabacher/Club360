// Service de integrity: verificación y recálculo de DVH/DVV, estado del club y bloqueo.
// Lógica de negocio y acceso a modelos. Filtra siempre por el clubId del usuario logueado (nunca el del body),
// registra las acciones relevantes en la bitácora (utils/logger) y lanza los errores con createError (utils/errors).
//
// Reglas (contexto, sección 11, "Bitácora, integridad y copias de seguridad"):
//   - verifyClub: DVH de las filas del club (readClubRows) y de los catálogos compartidos (sport y permission), y DVV de
//     cada tabla. El DVV es de la tabla completa (de todos los clubes): si no coincide, se marca igual, aunque pueda ser
//     por otro club, y reparar lo recalcula;
//   - getIntegrityStatus: el último resultado de cada club, en memoria por INTEGRITY_CACHE_MINUTES;
//   - con estado ERROR el club queda bloqueado: solo trabaja quien tiene integrity.manage o backup.manage;
//   - INTEGRITY_ALERT (in-app + email) solo cuando el estado pasa de OK a ERROR.
const sequelize = require('../../config/db')
const { Club, Dvv, Sport, Permission, Log } = require('../../models')
const { updateTableDVV } = require('../../models/integrityHooks')
const { getAvailableRoles, getEffectivePermissions, getActiveUsersWithPermission } = require('../access/access.service')
const { notify } = require('../notifications/notifications.service')

const logger = require('../../utils/logger')
const { createError } = require('../../utils/errors')
const { CLUB_TABLES, readClubRows, readTableRows } = require('../../utils/clubData')
const { computeRowDVH, computeTableDVV } = require('../../utils/integrity')
const { toCsv } = require('../../utils/csv')
const { today: todayAR } = require('../../utils/dates')
const { INTEGRITY_CACHE_MINUTES, TABLE_LABELS, LOG_ACTIONS } = require('../../utils/constants')
const { PERMISSIONS } = require('../../utils/permissions')
const { integrity: m } = require('../../utils/messages')

const STATUS = { OK: 'OK', ERROR: 'ERROR' }

// Permisos con los que se trabaja con el club bloqueado (para reparar o restaurar)
const LOCK_BYPASS_PERMISSIONS = [PERMISSIONS.INTEGRITY_MANAGE, PERMISSIONS.BACKUP_MANAGE]

// Catálogos compartidos: se verifican en todos los clubes, porque los usan todos
const CATALOG_MODELS = [Sport, Permission]

const SYSTEM = (clubId) => ({ clubId, userId: null, roleId: null })
const actorOf = ({ id: userId, clubId, activeRoleId }) => ({ clubId, userId, roleId: activeRoleId })

const CHECKABLE = [...CLUB_TABLES.map(({ Model }) => Model), ...CATALOG_MODELS].filter(Model => Model.rawAttributes.dvh)
const modelOf = (tableName) => CHECKABLE.find(Model => Model.getTableName() === tableName)
const tableNames = () => CHECKABLE.map(Model => Model.getTableName())

// Clave primaria de una fila, como texto: '15' o 'userId=3, roleId=2'
function keyOf(Model, row) {
    const keys = Model.primaryKeyAttributes
    return keys.length === 1 ? String(row[keys[0]]) : keys.map(name => `${name}=${row[name]}`).join(', ')
}

const whereOf = (Model, row) => Object.fromEntries(Model.primaryKeyAttributes.map(name => [name, row[name]]))

// ---------- Verificación ----------

// Revisa una tabla: el DVH de cada fila (rows) y el DVV de la tabla completa
async function checkTable(Model, rows, storedDvvs) {
    const errors = rows
        .filter(row => row.dvh !== computeRowDVH(Model, row))
        .map(row => ({ key: keyOf(Model, row), storedDvh: row.dvh, computedDvh: computeRowDVH(Model, row) }))

    const tableName = Model.getTableName()
    const computedDvv = await computeTableDVV(Model)
    // Sin fila en dvv: la tabla nunca se escribió con los hooks; está bien si sigue vacía (DVV 0)
    const storedDvv = storedDvvs.has(tableName) ? storedDvvs.get(tableName) : 0

    return {
        table: tableName,
        label: TABLE_LABELS[tableName] ?? tableName,
        shared: CATALOG_MODELS.includes(Model) || undefined,
        checked: rows.length,
        errors,
        dvvOk: storedDvv === computedDvv,
        storedDvv,
        computedDvv
    }
}

// Verifica un club: sus filas, las de los catálogos y el DVV de cada tabla. Devuelve el informe completo
async function verifyClub(clubId) {
    const [clubRows, storedDvvRows] = await Promise.all([readClubRows(clubId), Dvv.findAll({ raw: true })])
    const storedDvvs = new Map(storedDvvRows.map(row => [row.tableName, row.dvv]))

    const tables = []
    for (const { Model } of CLUB_TABLES) {
        if (Model.rawAttributes.dvh) tables.push(await checkTable(Model, clubRows[Model.getTableName()], storedDvvs))
    }
    for (const Model of CATALOG_MODELS) {
        tables.push(await checkTable(Model, await readTableRows(Model), storedDvvs))
    }

    const alteredRows = tables.reduce((sum, table) => sum + table.errors.length, 0)
    const ok = tables.every(table => table.errors.length === 0 && table.dvvOk)

    return {
        clubId,
        status: ok ? STATUS.OK : STATUS.ERROR,
        checkedAt: new Date(),
        alteredRows,
        tablesWithErrors: tables.filter(table => table.errors.length > 0 || !table.dvvOk).map(table => table.table),
        tables
    }
}

// ---------- Estado, caché y aviso ----------

const cache = new Map()      // clubId → { report, expiresAt }
const inFlight = new Map()   // clubId → promesa de la verificación en curso (para no verificar dos veces a la vez)
const blockedLogged = new Map()   // clubId → Set de userIds a los que ya se registró el bloqueo en este bloqueo

// Último estado conocido de un club cuando no está en la caché (por ejemplo, después de reiniciar el servidor): sale de
// la bitácora, así el aviso no se repite en cada reinicio. ERROR si lo último fue un INTEGRITY_ERROR
async function previousStatusOf(clubId) {
    const last = await Log.findOne({
        where: { clubId, action: [LOG_ACTIONS.INTEGRITY_ERROR.message, LOG_ACTIONS.INTEGRITY_REPAIRED.message, LOG_ACTIONS.BACKUP_RESTORED.message] },
        order: [['id', 'DESC']],
        attributes: ['action', 'details']
    })
    if (!last) return STATUS.OK
    if (last.action === LOG_ACTIONS.INTEGRITY_ERROR.message) return STATUS.ERROR
    return last.details?.includes('Estado: ERROR') ? STATUS.ERROR : STATUS.OK
}

const tablesText = (report) => report.tablesWithErrors.map(table => TABLE_LABELS[table] ?? table).join(', ')

// Al pasar de OK a ERROR: bitácora INTEGRITY_ERROR (Crítica) y aviso INTEGRITY_ALERT a quienes tienen integrity.manage
async function onBecameError(report) {
    const details = report.tables
        .filter(table => table.errors.length > 0 || !table.dvvOk)
        .map(table => `${table.label} (${table.table}): ${table.errors.length} registros alterados${table.dvvOk ? '' : ', DVV distinto'}`
            + (table.errors.length ? ` [${table.errors.slice(0, 20).map(error => error.key).join('; ')}]` : ''))
        .join('. ')

    await logger(SYSTEM(report.clubId), LOG_ACTIONS.INTEGRITY_ERROR, `Estado: ERROR. ${details}`)

    const recipients = await getActiveUsersWithPermission(report.clubId, PERMISSIONS.INTEGRITY_MANAGE)
    if (recipients.length === 0) return

    await notify({
        clubId: report.clubId,
        type: 'INTEGRITY_ALERT',
        recipientUserIds: recipients,
        title: 'Errores de integridad en los datos del club',
        message: `Se detectaron ${report.alteredRows} registros alterados en ${tablesText(report)}. Los demás usuarios no pueden entrar hasta que se reparen.`
    })
}

// Verifica un club sin caché, guarda el resultado y aplica el aviso si pasó de OK a ERROR
async function refreshStatus(clubId) {
    if (inFlight.has(clubId)) return inFlight.get(clubId)

    const task = (async () => {
        const cached = cache.get(clubId)
        const previous = cached ? cached.report.status : await previousStatusOf(clubId)
        const report = await verifyClub(clubId)

        cache.set(clubId, { report, expiresAt: Date.now() + INTEGRITY_CACHE_MINUTES * 60 * 1000 })
        if (report.status === STATUS.OK) blockedLogged.delete(clubId)
        if (previous === STATUS.OK && report.status === STATUS.ERROR) {
            blockedLogged.delete(clubId)
            await onBecameError(report)
        }
        return report
    })()

    inFlight.set(clubId, task)
    try {
        return await task
    } finally {
        inFlight.delete(clubId)
    }
}

// Estado del club desde la caché; si venció (o no hay), vuelve a verificar
async function getIntegrityStatus(clubId) {
    const cached = cache.get(clubId)
    const report = cached && cached.expiresAt > Date.now() ? cached.report : await refreshStatus(clubId)
    return { status: report.status, checkedAt: report.checkedAt, report }
}

// Invalida la caché de un club (o de todos: el DVV es de la tabla completa, así que reparar o restaurar puede cambiar
// el estado de los otros clubes)
function invalidateIntegrityCache(clubId = null) {
    if (clubId === null) cache.clear()
    else cache.delete(clubId)
}

// ---------- Bloqueo ----------

const canWorkWhileLocked = (permissions) => LOCK_BYPASS_PERMISSIONS.some(name => permissions.includes(name))

// true si alguno de los roles disponibles del usuario permite trabajar con el club bloqueado (para elegir o cambiar de
// rol, y en el login de quien tiene más de un rol)
async function anyRoleCanWorkWhileLocked(userId) {
    for (const role of await getAvailableRoles(userId)) {
        if (canWorkWhileLocked(await getEffectivePermissions(userId, role.id))) return true
    }
    return false
}

// Registra ACCESS_BLOCKED_INTEGRITY una vez por usuario y por bloqueo
async function logBlockedAccess({ clubId, userId, roleId }, where) {
    if (!blockedLogged.has(clubId)) blockedLogged.set(clubId, new Set())
    const logged = blockedLogged.get(clubId)
    if (logged.has(userId)) return

    logged.add(userId)
    await logger({ clubId, userId, roleId }, LOG_ACTIONS.ACCESS_BLOCKED_INTEGRITY, `El club tiene errores de integridad (${where})`)
}

const lockError = () => createError(m.locked, 503, 'INTEGRITY_LOCK')

// Login: con el club bloqueado, solo entra quien tiene (en alguno de sus roles) integrity.manage o backup.manage.
// Si no, 503 INTEGRITY_LOCK (la contraseña ya se validó: no suma un intento fallido)
async function assertLoginAllowed(user) {
    const { status } = await getIntegrityStatus(user.clubId)
    if (status === STATUS.OK) return
    if (await anyRoleCanWorkWhileLocked(user.id)) return

    await logBlockedAccess({ clubId: user.clubId, userId: user.id, roleId: null }, 'inicio de sesión')
    throw lockError()
}

// Rutas que puede usar quien tiene otro rol que sí trabaja con el club bloqueado, para elegirlo o cambiarlo
const ROLE_CHANGE_PATHS = ['/auth/me', '/auth/switch-role', '/auth/logout']

// isAuth: con el club bloqueado, cada request revisa los permisos efectivos del rol activo (una vez por request: se
// devuelven para que checkPermission no los vuelva a calcular). Devuelve los permisos, o null si el club no está
// bloqueado. Si no puede trabajar, 503 INTEGRITY_LOCK
async function assertRequestAllowed({ id: userId, clubId, activeRoleId }, path) {
    const { status } = await getIntegrityStatus(clubId)
    if (status === STATUS.OK) return null

    const permissions = activeRoleId ? await getEffectivePermissions(userId, activeRoleId) : []
    if (canWorkWhileLocked(permissions)) return permissions

    if (ROLE_CHANGE_PATHS.some(allowed => path.startsWith(allowed)) && await anyRoleCanWorkWhileLocked(userId)) return permissions

    await logBlockedAccess({ clubId, userId, roleId: activeRoleId }, path)
    throw lockError()
}

// Clubes en los que pueden correr los jobs que escriben datos: los bloqueados se saltean y se registra en su bitácora
async function getUnlockedClubIds(jobName) {
    const clubs = await Club.findAll({ attributes: ['id'], raw: true })
    const unlocked = []

    for (const { id } of clubs) {
        const { status } = await getIntegrityStatus(id)
        if (status === STATUS.OK) {
            unlocked.push(id)
        } else {
            await logger(SYSTEM(id), LOG_ACTIONS.JOB_SKIPPED_INTEGRITY, `Tarea ${jobName} omitida: el club tiene errores de integridad`)
        }
    }
    return unlocked
}

// ---------- Endpoints ----------

// Lo que muestra el front (aviso del layout): sin el detalle
async function getStatus(user) {
    const { status, checkedAt } = await getIntegrityStatus(user.clubId)
    return { status, checkedAt }
}

// Verificar ahora (integrity.manage): sin caché
async function verifyNow(user) {
    return refreshStatus(user.clubId)
}

// Reparar (integrity.manage): recalcula el DVH de las filas del club con error (y de los catálogos, si se eligieron) y
// el DVV de esas tablas. Acepta los datos actuales como válidos. Después vuelve a verificar
async function repair(actor, { tables, all }) {
    const report = await refreshStatus(actor.clubId)
    const selected = all ? tableNames() : tables.filter(name => tableNames().includes(name))
    const toRepair = report.tables.filter(table => selected.includes(table.table) && (table.errors.length > 0 || !table.dvvOk))
    if (toRepair.length === 0) throw createError(m.nothingToRepair, 400)

    const repaired = await sequelize.transaction(async (transaction) => {
        const result = []
        for (const table of toRepair) {
            const Model = modelOf(table.table)
            const isCatalog = CATALOG_MODELS.includes(Model)
            const rows = isCatalog
                ? await readTableRows(Model, { transaction })
                : (await readClubRows(actor.clubId, { transaction }))[table.table]

            const keys = []
            for (const row of rows) {
                const dvh = computeRowDVH(Model, row)
                if (row.dvh === dvh) continue
                await Model.update({ dvh }, { where: whereOf(Model, row), hooks: false, silent: true, fields: ['dvh'], transaction })
                keys.push(keyOf(Model, row))
            }

            await updateTableDVV(Model, transaction)
            result.push({ table: table.table, label: table.label, keys })
        }
        return result
    })

    await logger(actorOf(actor), LOG_ACTIONS.INTEGRITY_REPAIRED, repaired
        .map(table => `${table.label} (${table.table}): ${table.keys.length ? `filas ${table.keys.slice(0, 50).join('; ')}` : 'DVV recalculado'}`)
        .join('. '))

    invalidateIntegrityCache()
    return refreshStatus(actor.clubId)
}

// Informe en CSV (integrity.manage): el último resultado de la caché, o una verificación nueva si no hay
async function getReportCsv(user) {
    const cached = cache.get(user.clubId)
    const report = cached ? cached.report : await refreshStatus(user.clubId)

    const rows = []
    for (const table of report.tables) {
        if (table.errors.length === 0) {
            rows.push([table.label, table.checked, '', '', '', table.dvvOk ? 'Sí' : 'No'])
        } else {
            for (const error of table.errors) rows.push([table.label, table.checked, error.key, error.storedDvh, error.computedDvh, table.dvvOk ? 'Sí' : 'No'])
        }
    }

    const club = await Club.findByPk(user.clubId, { attributes: ['name'] })
    return {
        clubName: club.name,
        content: toCsv(['Tabla', 'Filas revisadas', 'Clave', 'DVH guardado', 'DVH calculado', 'DVV correcto'], rows)
    }
}

// ---------- Job nocturno ----------

// Verifica cada club sin caché (job integrityCheck, todos los días a las 02:30). Actualiza la caché y avisa si alguno
// pasó a ERROR. today: fecha de referencia (como los jobs del P14), solo para el resumen
async function runNightlyCheck(today = todayAR()) {
    const clubs = await Club.findAll({ attributes: ['id'], raw: true })
    const results = []
    for (const { id } of clubs) {
        const report = await refreshStatus(id)
        results.push({ clubId: id, status: report.status, alteredRows: report.alteredRows })
    }
    return { today, results }
}

module.exports = {
    STATUS,
    verifyClub,
    getIntegrityStatus,
    refreshStatus,
    invalidateIntegrityCache,
    assertLoginAllowed,
    assertRequestAllowed,
    getUnlockedClubIds,
    getStatus,
    verifyNow,
    repair,
    getReportCsv,
    runNightlyCheck
}
