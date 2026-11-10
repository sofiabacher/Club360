// Service de logs: bitácora y exportación a CSV.
// Lógica de negocio y acceso a modelos. Filtra siempre por el clubId del usuario logueado (nunca el del body),
// registra las acciones relevantes en la bitácora (utils/logger) y lanza los errores con createError (utils/errors).
//
// log no tiene FK a user ni a role (P16): un registro conserva sus ids aunque el usuario ya no exista (por ejemplo,
// después de restaurar un backup anterior a ese usuario). En ese caso se muestra "(usuario eliminado)".
const { Op } = require('sequelize')

const sequelize = require('../../config/db')
const { Log, User, Role, Club } = require('../../models')

const logger = require('../../utils/logger')
const { createError } = require('../../utils/errors')
const { addDays } = require('../../utils/dates')
const { toCsv, fileStamp, slugOf } = require('../../utils/csv')
const { CRITICITY_LABELS, LOG_ACTIONS } = require('../../utils/constants')
const { logs: m } = require('../../utils/messages')

const LOGS_PAGE_SIZE = 50
const TIME_ZONE = 'America/Argentina/Buenos_Aires'
const DELETED_USER = '(usuario eliminado)'

const actorOf = ({ id: userId, clubId, activeRoleId }) => ({ clubId, userId, roleId: activeRoleId })

const includeUser = { model: User, as: 'user', attributes: ['id', 'name', 'lastName', 'username'], required: false }
const includeRole = { model: Role, as: 'role', attributes: ['id', 'name'], required: false }

// Condición de los filtros. from y to: fechas AAAA-MM-DD en hora de Argentina (to incluye todo ese día).
// search: en el detalle y en el nombre, el apellido o el usuario de quien hizo la acción
function whereOf(clubId, { from, to, criticity, action, userId, search }) {
    const words = String(search ?? '').trim().split(/\s+/).filter(Boolean)
    const createdAt = {
        ...(from && { [Op.gte]: new Date(`${from}T00:00:00.000-03:00`) }),
        ...(to && { [Op.lt]: new Date(`${addDays(to, 1)}T00:00:00.000-03:00`) })
    }

    return {
        clubId,
        ...((from || to) && { createdAt }),
        ...(criticity && { criticity: Number(criticity) }),
        ...(action && { action }),
        ...(userId && { userId: Number(userId) }),
        ...(words.length > 0 && {
            [Op.and]: words.map(word => ({
                [Op.or]: ['details', '$user.name$', '$user.lastName$', '$user.username$'].map(field => ({ [field]: { [Op.like]: `%${word}%` } }))
            }))
        })
    }
}

// Fecha y hora en Argentina: { date: '08/11/2026', time: '18:30:05' }
function dateTimeOf(value) {
    const parts = Object.fromEntries(new Intl.DateTimeFormat('es-AR', {
        timeZone: TIME_ZONE, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
    }).formatToParts(new Date(value)).map(part => [part.type, part.value]))
    return { date: `${parts.day}/${parts.month}/${parts.year}`, time: `${parts.hour}:${parts.minute}:${parts.second}` }
}

function formatLog(log) {
    return {
        id: log.id,
        createdAt: log.createdAt,
        user: log.userId === null
            ? null   // Lo hizo el sistema (un job, por ejemplo)
            : log.user
                ? { id: log.user.id, name: log.user.name, lastName: log.user.lastName, username: log.user.username }
                : { id: log.userId, name: DELETED_USER, lastName: '', username: '' },
        role: log.role ? log.role.name : null,
        action: log.action,
        details: log.details,
        criticity: log.criticity
    }
}

// Registros del club, del más nuevo al más viejo, de a LOGS_PAGE_SIZE. byCriticity: la cantidad de cada criticidad en
// todo el filtro (no solo en la página)
async function listLogs(user, filters) {
    const page = Number(filters.page) || 1   // Con Express 5 req.query es de solo lectura: el toInt del validator no llega
    const where = whereOf(user.clubId, filters)

    const [{ count, rows }, totals] = await Promise.all([
        Log.findAndCountAll({
            where,
            include: [includeUser, includeRole],
            order: [['createdAt', 'DESC'], ['id', 'DESC']],
            limit: LOGS_PAGE_SIZE,
            offset: (page - 1) * LOGS_PAGE_SIZE,
            distinct: true
        }),
        Log.findAll({
            where,
            include: [{ ...includeUser, attributes: [] }],
            attributes: ['criticity', [sequelize.fn('COUNT', sequelize.col('Log.id')), 'count']],
            group: ['criticity'],
            raw: true
        })
    ])

    const byCriticity = Object.fromEntries(Object.keys(CRITICITY_LABELS).map(key => [key, 0]))
    totals.forEach(row => { byCriticity[row.criticity] = Number(row.count) })

    return {
        items: rows.map(formatLog),
        byCriticity,
        total: count,
        page,
        pageSize: LOGS_PAGE_SIZE,
        totalPages: Math.max(1, Math.ceil(count / LOGS_PAGE_SIZE))
    }
}

// Opciones de los filtros: las acciones posibles (los message de LOG_ACTIONS) y los usuarios del club con registros
async function getFilters(user) {
    const actions = [...new Set(Object.values(LOG_ACTIONS).map(action => action.message))].sort((a, b) => a.localeCompare(b, 'es'))

    const userIds = (await Log.findAll({
        where: { clubId: user.clubId, userId: { [Op.ne]: null } },
        attributes: [[sequelize.fn('DISTINCT', sequelize.col('userId')), 'userId']],
        raw: true
    })).map(row => row.userId)

    const users = userIds.length === 0 ? [] : await User.findAll({
        where: { id: userIds, clubId: user.clubId },
        attributes: ['id', 'name', 'lastName', 'username'],
        order: [['lastName', 'ASC'], ['name', 'ASC']],
        raw: true
    })

    return { actions, users, criticities: Object.entries(CRITICITY_LABELS).map(([value, label]) => ({ value: Number(value), label })) }
}

// CSV con todos los registros del filtro (logs.export). Sin registros: 404. Exportar queda registrado
async function exportLogs(actor, filters) {
    const rows = await Log.findAll({
        where: whereOf(actor.clubId, filters),
        include: [includeUser, includeRole],
        order: [['createdAt', 'DESC'], ['id', 'DESC']]
    })
    if (rows.length === 0) throw createError(m.nothingToExport, 404)

    const lines = rows.map(row => {
        const log = formatLog(row)
        const { date, time } = dateTimeOf(log.createdAt)
        return [
            date,
            time,
            log.user ? log.user.username || DELETED_USER : 'Sistema',
            log.user ? `${log.user.name} ${log.user.lastName}`.trim() : '',
            log.role ?? '',
            log.action,
            log.details ?? '',
            CRITICITY_LABELS[log.criticity] ?? log.criticity
        ]
    })

    const club = await Club.findByPk(actor.clubId, { attributes: ['name'] })
    const applied = Object.entries(filters).filter(([key, value]) => key !== 'page' && value).map(([key, value]) => `${key}=${value}`)
    await logger(actorOf(actor), LOG_ACTIONS.LOGS_EXPORTED, `${rows.length} registros. Filtros: ${applied.length ? applied.join(', ') : 'ninguno'}`)

    return {
        fileName: `bitacora-${slugOf(club.name)}-${fileStamp().minutes}.csv`,
        content: toCsv(['Fecha', 'Hora', 'Usuario', 'Nombre', 'Rol', 'Acción', 'Detalle', 'Criticidad'], lines)
    }
}

module.exports = {
    listLogs,
    getFilters,
    exportLogs
}
