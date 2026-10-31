// Service de notifications: notificaciones in-app y por email.
// Lógica de negocio y acceso a modelos. Filtra siempre por el clubId del usuario logueado (nunca el del body),
// registra las acciones relevantes en la bitácora (utils/logger) y lanza los errores con createError (utils/errors).
//
// Todo aviso a un usuario pasa por notify(): ningún módulo crea notification ni manda emails de notificación por su cuenta.
const { Op } = require('sequelize')

const { Notification, User, Member, Club, ClubSport, Sport, Fee, Inscription, Staff, UserRole, Role } = require('../../models')
const { getEffectivePermissions } = require('../access/access.service')
const { isActiveStaff } = require('../staff/staff.service')
const { getActivePlayersOfCategory, getCategoriesOfStaff, isStaffAssignedToCategory } = require('../leagues/leagues.service')

const logger = require('../../utils/logger')
const { createError } = require('../../utils/errors')
const { sendNotificationEmail } = require('../../utils/mailer/senders')
const { isAdult } = require('../../utils/dates')
const {
    USER_STATES,
    MEMBER_STATES,
    INSCRIPTION_STATES,
    FEE_STATES,
    STAFF_ROLES,
    CATEGORY_STAFF_ROLES,
    NOTIFICATION_TYPES,
    LOG_ACTIONS
} = require('../../utils/constants')
const { PERMISSIONS } = require('../../utils/permissions')
const { notifications: m } = require('../../utils/messages')

const NOTIFICATIONS_PAGE_SIZE = 20

// Les llegan las notificaciones a los usuarios Activos y a los Bloqueados (un bloqueado igual tiene que enterarse)
const NOTIFIABLE_STATES = [USER_STATES.ACTIVE, USER_STATES.BLOCKED]

// Socios que cuentan para los avisos: Activos o Suspendidos (no los dados de baja)
const CURRENT_MEMBER_STATES = [MEMBER_STATES.ACTIVE, MEMBER_STATES.SUSPENDED]

const actorOf = ({ id: userId, clubId, activeRoleId }) => ({ clubId, userId, roleId: activeRoleId })

const unique = (values) => [...new Set(values.filter(Boolean))]

// ---------- Destinatarios ----------

// Adultos Familia vinculados a los socios menores de esta lista de usuarios
async function linkedAdultsOf(clubId, userIds, { transaction } = {}) {
    if (userIds.length === 0) return []

    const minors = await Member.findAll({
        where: { clubId, userId: userIds, linkStatus: true, adultUserId: { [Op.ne]: null } },
        attributes: ['adultUserId'],
        include: [{ model: User, as: 'user', attributes: ['birthDate'] }],
        transaction
    })

    return minors.filter(member => !isAdult(member.user.birthDate)).map(member => member.adultUserId)
}

// Lista final de destinatarios: sin repetidos, con los adultos de los menores de familyUserIds, y solo usuarios del club
// Activos o Bloqueados. Devuelve los usuarios con su email
async function buildRecipients(clubId, { userIds, familyUserIds = [] }, { transaction } = {}) {
    const adults = await linkedAdultsOf(clubId, unique(familyUserIds), { transaction })
    const ids = unique([...userIds, ...adults])
    if (ids.length === 0) return []

    return User.findAll({
        where: { id: ids, clubId, userStateId: NOTIFIABLE_STATES },
        attributes: ['id', 'clubId', 'name', 'lastName', 'email'],
        order: [['id', 'ASC']],
        transaction
    })
}

// Manda los emails de a uno y en segundo plano: la request no los espera. Si uno falla, el sender lo registra como
// MAIL_ERROR y se sigue con el resto; la notificación in-app ya está creada
function dispatchEmails(recipients, content) {
    ;(async () => {
        for (const user of recipients) {
            try {
                await sendNotificationEmail(user, content)
            } catch {
                // Ya quedó en la bitácora (MAIL_ERROR)
            }
        }
    })()
}

// Crea una notificación por destinatario y, si el tipo lo indica, programa los emails.
//   - type: clave de NOTIFICATION_TYPES (que define si va por email; GENERAL, solo con sendEmail);
//   - includeFamily: suma al adulto Familia de cada destinatario que sea un socio menor vinculado;
//   - transmitterId: null si la genera el sistema.
// Si viene una transacción, las notificaciones se crean en ella y los emails salen después de confirmarla (si se
// deshace, no sale ninguno). A quien no tiene email (por ejemplo, un menor) no se le manda.
// Devuelve { created, emails }.
async function notify({ clubId, type, recipientUserIds, title, message, transmitterId = null, includeFamily = false, sendEmail = false }, { transaction } = {}) {
    const channel = NOTIFICATION_TYPES[type]
    if (!channel) throw createError(m.invalidType, 500)

    const recipients = await buildRecipients(clubId, {
        userIds: recipientUserIds,
        familyUserIds: includeFamily ? recipientUserIds : []
    }, { transaction })

    for (const user of recipients) {
        await Notification.create({ clubId, recipientId: user.id, transmitterId, type, title, message, isRead: false }, { transaction })
    }

    const withEmail = channel.email === true || (channel.email === 'optional' && sendEmail)
    const emailRecipients = withEmail ? recipients.filter(user => user.email) : []

    if (emailRecipients.length > 0) {
        const club = await Club.findByPk(clubId, { attributes: ['name'], transaction })
        const dispatch = () => dispatchEmails(emailRecipients, { clubName: club.name, title, message })

        if (transaction) transaction.afterCommit(dispatch)
        else dispatch()
    }

    return { created: recipients.length, emails: emailRecipients.length }
}

// ---------- Avisos generales: a quién le llegan ----------
// El permiso de envío define las opciones (contexto, sección 6). audience:
//   - notifications.sendAll: { scope: 'club' } o { scope: 'segments', segments, includeFamilies, staffRoles }
//   - notifications.sendSport: { scope: 'sport', groups: ['players', 'families', 'coaches'] }
//   - notifications.sendCategory: { scope: 'categories', categoryIds, includeFamilies }

const SCOPE_PERMISSIONS = {
    club: PERMISSIONS.NOTIFICATIONS_SEND_ALL,
    segments: PERMISSIONS.NOTIFICATIONS_SEND_ALL,
    sport: PERMISSIONS.NOTIFICATIONS_SEND_SPORT,
    categories: PERMISSIONS.NOTIFICATIONS_SEND_CATEGORY
}

// Usuarios de los socios Activos o Suspendidos (con condiciones extra sobre member e includes)
async function memberUserIds(clubId, { where = {}, include = [] } = {}) {
    const members = await Member.findAll({ where: { clubId, memberStateId: CURRENT_MEMBER_STATES, ...where }, attributes: ['userId'], include, raw: true })
    return members.map(member => member.userId)
}

// Usuarios del club con alguno de esos roles de staff
async function staffUserIds(clubId, roleNames) {
    const rows = await UserRole.findAll({
        attributes: ['userId'],
        include: [{ model: Role, as: 'role', attributes: [], where: { clubId, name: roleNames, isBase: true } }],
        raw: true
    })

    return rows.map(row => row.userId)
}

// Deporte del Representante: el de su registro staff si es staff activo; si no, todos los del club (null)
async function sportScopeOf(user) {
    if (!await isActiveStaff(user.id)) return null
    const staff = await Staff.findOne({ where: { userId: user.id, clubId: user.clubId }, attributes: ['clubSportId'] })
    return staff.clubSportId
}

const AUDIENCE_RESOLVERS = {
    // Todos los usuarios ACTIVE del club
    club: async ({ clubId }) => {
        const users = await User.findAll({ where: { clubId, userStateId: USER_STATES.ACTIVE }, attributes: ['id'], raw: true })
        return { userIds: users.map(user => user.id) }
    },

    // Uno o más segmentos combinados. includeFamilies suma a los adultos de los socios menores de members y overdue
    segments: async ({ clubId }, { segments, includeFamilies = false, staffRoles = [] }) => {
        const userIds = []
        const familyUserIds = []

        if (segments.includes('members')) {
            const ids = await memberUserIds(clubId)
            userIds.push(...ids)
            if (includeFamilies) familyUserIds.push(...ids)
        }

        if (segments.includes('staff')) {
            userIds.push(...await staffUserIds(clubId, staffRoles.length > 0 ? staffRoles : STAFF_ROLES))
        }

        // Socios con al menos una cuota Vencida. Avisos manuales: no reemplazan los automáticos de mora del módulo de cuotas
        if (segments.includes('overdue')) {
            const ids = await memberUserIds(clubId, {
                include: [{ model: Fee, as: 'fees', attributes: [], where: { feeState: FEE_STATES.OVERDUE } }]
            })
            userIds.push(...ids)
            if (includeFamilies) familyUserIds.push(...ids)
        }

        // Adultos con al menos un socio menor vinculado
        if (segments.includes('families')) {
            const members = await Member.findAll({ where: { clubId, linkStatus: true, adultUserId: { [Op.ne]: null } }, attributes: ['adultUserId'], raw: true })
            userIds.push(...members.map(member => member.adultUserId))
        }

        return { userIds, familyUserIds }
    },

    // Jugadoras con inscripción Aprobada en el deporte del Representante, sus familias y las entrenadoras y preparadoras
    sport: async (user, { groups }) => {
        const clubSportId = await sportScopeOf(user)
        const userIds = []
        const familyUserIds = []

        const players = await memberUserIds(user.clubId, {
            include: [{ model: Inscription, as: 'inscriptions', attributes: [], where: { inscriptionState: INSCRIPTION_STATES.APPROVED, ...(clubSportId && { clubSportId }) } }]
        })

        if (groups.includes('players')) userIds.push(...players)
        if (groups.includes('families')) userIds.push(...await linkedAdultsOf(user.clubId, unique(players)))

        if (groups.includes('coaches')) {
            const coaches = new Set(await staffUserIds(user.clubId, CATEGORY_STAFF_ROLES))
            const staff = await Staff.findAll({ where: { clubId: user.clubId, ...(clubSportId && { clubSportId }) }, attributes: ['userId'], raw: true })
            userIds.push(...staff.map(item => item.userId).filter(id => coaches.has(id)))
        }

        return { userIds, familyUserIds }
    },

    // Jugadoras activas de las categorías de la Entrenadora (solo las suyas) y, si quiere, sus familias
    categories: async (user, { categoryIds, includeFamilies = false }) => {
        const staff = await Staff.findOne({ where: { userId: user.id, clubId: user.clubId }, attributes: ['id'] })
        const userIds = []

        for (const categoryId of unique(categoryIds)) {
            if (!staff || !await isStaffAssignedToCategory(user.clubId, staff.id, categoryId)) throw createError(m.categoryNotAllowed, 403)
            const players = await getActivePlayersOfCategory(user.clubId, categoryId)
            userIds.push(...players.map(player => player.userId))
        }

        return { userIds, familyUserIds: includeFamilies ? userIds : [] }
    }
}

// Destinatarios de un aviso general según la opción elegida y los permisos de quien envía. Una opción que no le
// corresponde → 403. Devuelve { userIds, familyUserIds }
async function resolveAudience(user, audience) {
    const permissions = await getEffectivePermissions(user.id, user.activeRoleId)
    const required = SCOPE_PERMISSIONS[audience.scope]
    if (!required || !permissions.includes(required)) throw createError(m.audienceNotAllowed, 403)

    const { userIds, familyUserIds = [] } = await AUDIENCE_RESOLVERS[audience.scope](user, audience)
    return { userIds, familyUserIds }
}

// Lista final para el resumen y el envío. Quien envía no se incluye a sí mismo (aunque sea de un grupo elegido)
async function recipientsOf(user, audience) {
    const { userIds, familyUserIds } = await resolveAudience(user, audience)
    const recipients = await buildRecipients(user.clubId, { userIds, familyUserIds })
    return { recipients: recipients.filter(recipient => recipient.id !== user.id), userIds, familyUserIds }
}

// Opciones de destinatarios que puede usar quien envía, con los datos para armarlas
async function getSendOptions(user) {
    const permissions = await getEffectivePermissions(user.id, user.activeRoleId)
    const options = {}

    if (permissions.includes(PERMISSIONS.NOTIFICATIONS_SEND_ALL)) {
        options.club = true
        options.segments = { segments: ['members', 'staff', 'overdue', 'families'], staffRoles: STAFF_ROLES }
    }

    if (permissions.includes(PERMISSIONS.NOTIFICATIONS_SEND_SPORT)) {
        const clubSportId = await sportScopeOf(user)
        const sport = clubSportId ? await ClubSport.findByPk(clubSportId, { include: [{ model: Sport, as: 'sport', attributes: ['name'] }] }) : null
        options.sport = { name: sport?.sport.name ?? null, groups: ['players', 'families', 'coaches'] }
    }

    if (permissions.includes(PERMISSIONS.NOTIFICATIONS_SEND_CATEGORY)) {
        const staff = await Staff.findOne({ where: { userId: user.id, clubId: user.clubId }, attributes: ['id'] })
        const categories = staff ? await getCategoriesOfStaff(user.clubId, staff.id) : []
        options.categories = categories.map(category => ({ id: category.id, name: category.name, league: category.league.name, ageGroup: category.ageGroup.label }))
    }

    if (Object.keys(options).length === 0) throw createError(m.audienceNotAllowed, 403)
    return options
}

// Cuántas personas lo van a recibir y cuántas tienen email
async function previewNotice(user, { audience }) {
    const { recipients } = await recipientsOf(user, audience)
    return { recipients: recipients.length, withEmail: recipients.filter(recipient => recipient.email).length }
}

// Descripción de la opción elegida para la bitácora
function describeAudience({ scope, segments = [], staffRoles = [], groups = [], categoryIds = [], includeFamilies }) {
    const families = includeFamilies ? ', con las familias de los menores' : ''
    if (scope === 'club') return 'todo el club'
    if (scope === 'segments') return `grupos: ${segments.join(', ')}${staffRoles.length > 0 ? ` (staff: ${staffRoles.join(', ')})` : ''}${families}`
    if (scope === 'sport') return `deporte: ${groups.join(', ')}`
    return `categorías ${categoryIds.join(', ')}${families}`
}

// Aviso GENERAL con notify(), con quien envía como transmitter
async function sendNotice(user, { audience, title, message, sendEmail = false }) {
    const { recipients } = await recipientsOf(user, audience)
    if (recipients.length === 0) throw createError(m.noRecipients, 400)

    // Se pasa la lista final ya resuelta (con las familias), así notify crea exactamente lo que mostró el resumen
    const result = await notify({
        clubId: user.clubId,
        type: 'GENERAL',
        recipientUserIds: recipients.map(recipient => recipient.id),
        title,
        message,
        transmitterId: user.id,
        sendEmail
    })

    await logger(actorOf(user), LOG_ACTIONS.NOTIFICATION_SENT,
        `"${title}" a ${describeAudience(audience)}: ${result.created} destinatarios${sendEmail ? `, ${result.emails} por email` : ''}`)

    return { recipients: result.created, emails: result.emails }
}

// ---------- Notificaciones del usuario ----------

async function listNotifications({ id: userId, clubId }, { unread, page = 1 }) {
    page = Number(page) || 1   // Con Express 5 req.query es de solo lectura: el toInt del validator no llega hasta acá

    const { count, rows } = await Notification.findAndCountAll({
        where: { recipientId: userId, clubId, ...(unread === 'true' && { isRead: false }) },
        include: [{ model: User, as: 'transmitter', attributes: ['name', 'lastName'] }],
        order: [['createdAt', 'DESC'], ['id', 'DESC']],
        limit: NOTIFICATIONS_PAGE_SIZE,
        offset: (page - 1) * NOTIFICATIONS_PAGE_SIZE
    })

    return {
        items: rows.map(notification => ({
            id: notification.id,
            type: notification.type,
            title: notification.title,
            message: notification.message,
            isRead: notification.isRead,
            createdAt: notification.createdAt,
            transmitter: notification.transmitter ? `${notification.transmitter.name} ${notification.transmitter.lastName}` : null   // null: la mandó el sistema
        })),
        total: count,
        page,
        pageSize: NOTIFICATIONS_PAGE_SIZE,
        totalPages: Math.max(1, Math.ceil(count / NOTIFICATIONS_PAGE_SIZE))
    }
}

async function getUnreadCount({ id: userId, clubId }) {
    return { count: await Notification.count({ where: { recipientId: userId, clubId, isRead: false } }) }
}

// Solo las propias: una ajena responde 404, como si no existiera
async function markAsRead({ id: userId, clubId }, notificationId) {
    const notification = await Notification.findOne({ where: { id: notificationId, recipientId: userId, clubId } })
    if (!notification) throw createError(m.notificationNotFound, 404)

    if (!notification.isRead) await notification.update({ isRead: true })
    return { id: notification.id, isRead: true }
}

async function markAllAsRead({ id: userId, clubId }) {
    const unread = await Notification.findAll({ where: { recipientId: userId, clubId, isRead: false } })
    for (const notification of unread) await notification.update({ isRead: true })
    return { updated: unread.length }
}

module.exports = {
    notify,
    resolveAudience,
    getSendOptions,
    previewNotice,
    sendNotice,
    listNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead
}
