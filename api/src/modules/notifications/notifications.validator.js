// Validator de notifications.
// Reglas de express-validator: solo el formato de los datos, no reglas de negocio.
// Qué opciones de destinatarios puede usar cada uno lo decide el service, según sus permisos de envío.
const { body, param, query } = require('express-validator')
const { STAFF_ROLES } = require('../../utils/constants')
const { notifications: m } = require('../../utils/messages')

const SCOPES = ['club', 'segments', 'sport', 'categories']
const SEGMENTS = ['members', 'staff', 'overdue', 'families']
const SPORT_GROUPS = ['players', 'families', 'coaches']

// Lista sin repetidos, con al menos un elemento, de valores permitidos
const isListOf = (allowed) => (value) => Array.isArray(value) && value.length > 0 && value.every(item => allowed.includes(item)) && new Set(value).size === value.length

// Destinatarios: el scope y sus datos (ver resolveAudience en el service)
const audience = [
    body('audience').isObject().withMessage(m.audienceInvalid).bail(),
    body('audience.scope').isIn(SCOPES).withMessage(m.audienceInvalid),
    body('audience.segments')
        .if(body('audience.scope').equals('segments'))
        .custom(isListOf(SEGMENTS)).withMessage(m.segmentsInvalid),
    body('audience.staffRoles')
        .optional()
        .custom(value => Array.isArray(value) && value.every(role => STAFF_ROLES.includes(role))).withMessage(m.staffRolesInvalid),
    body('audience.groups')
        .if(body('audience.scope').equals('sport'))
        .custom(isListOf(SPORT_GROUPS)).withMessage(m.groupsInvalid),
    body('audience.categoryIds')
        .if(body('audience.scope').equals('categories'))
        .custom(value => Array.isArray(value) && value.length > 0 && value.every(id => Number.isInteger(id) && id > 0)).withMessage(m.categoryIdsInvalid),
    body('audience.includeFamilies').optional().isBoolean({ strict: true }).withMessage(m.includeFamiliesInvalid)
]

const list = [
    query('unread').optional({ values: 'falsy' }).isIn(['true', 'false']).withMessage(m.unreadInvalid),
    query('page').optional().isInt({ min: 1 }).withMessage(m.pageInvalid)
]

const byId = [param('id').isInt({ min: 1 }).withMessage(m.idInvalid).bail().toInt()]

const preview = [...audience]

// Historial de enviados
const sentList = [
    query('page').optional().isInt({ min: 1 }).withMessage(m.pageInvalid),
    query('senderId').optional({ values: 'falsy' }).isInt({ min: 1 }).withMessage(m.senderIdInvalid)
]

const byBatch = [param('batchId').isUUID().withMessage(m.batchIdInvalid)]

const send = [
    ...audience,
    body('title').isString().withMessage(m.titleInvalid).bail().trim().isLength({ min: 3, max: 150 }).withMessage(m.titleInvalid),
    body('message').isString().withMessage(m.messageInvalid).bail().trim().isLength({ min: 1, max: 2000 }).withMessage(m.messageInvalid),
    body('sendEmail').optional().isBoolean({ strict: true }).withMessage(m.sendEmailInvalid)
]

module.exports = {
    list,
    byId,
    preview,
    send,
    sentList,
    byBatch
}
