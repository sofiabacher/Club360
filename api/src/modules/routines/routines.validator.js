// Validator de routines.
// Reglas de express-validator: solo el formato de los datos, no reglas de negocio.
// Que la categoría esté en el alcance, que la semana sea editable y que el día esté libre lo controla el service.
const { body, param, query } = require('express-validator')
const { isoDayOfWeek } = require('../../utils/dates')
const { ROUTINE_DAYS } = require('../../utils/constants')
const { routines: m } = require('../../utils/messages')

const DATE_FORMAT = /^\d{4}-\d{2}-\d{2}$/

// Fecha AAAA-MM-DD que existe en el calendario y es lunes
function isMonday(value) {
    if (!DATE_FORMAT.test(String(value))) return false
    const date = new Date(`${value}T12:00:00Z`)
    return !isNaN(date) && date.toISOString().startsWith(value) && isoDayOfWeek(value) === 1
}

const categoryQuery = query('categoryId').isInt({ min: 1 }).withMessage(m.categoryInvalid)
const weekStartQuery = query('weekStart').optional({ values: 'falsy' }).custom(isMonday).withMessage(m.weekStartInvalid)
const idParam = param('id').isInt({ min: 1 }).withMessage(m.idInvalid).bail().toInt()

// Campos que se cargan y se editan (llegan como multipart/form-data: todo es texto)
const content = [
    body('title').isString().withMessage(m.titleInvalid).bail().trim().isLength({ min: 3, max: 150 }).withMessage(m.titleInvalid),
    body('description').isString().withMessage(m.descriptionInvalid).bail().trim().isLength({ min: 1, max: 3000 }).withMessage(m.descriptionInvalid),
    body('videoUrl')
        .optional({ values: 'falsy' })
        .isString().withMessage(m.videoUrlInvalid).bail()
        .trim()
        .isLength({ max: 255 }).withMessage(m.videoUrlInvalid).bail()
        .isURL({ protocols: ['http', 'https'], require_protocol: true }).withMessage(m.videoUrlInvalid)
]

const week = [categoryQuery, weekStartQuery]

const weeks = [categoryQuery]

const mine = [weekStartQuery]

const create = [
    body('categoryId').isInt({ min: 1 }).withMessage(m.categoryInvalid).bail().toInt(),
    body('weekStart').custom(isMonday).withMessage(m.weekStartInvalid),
    // Solo de lunes a viernes (ROUTINE_DAYS)
    body('dayOfWeek').isInt({ min: ROUTINE_DAYS[0].value, max: ROUTINE_DAYS[ROUTINE_DAYS.length - 1].value }).withMessage(m.dayOfWeekInvalid).bail().toInt(),
    ...content
]

const update = [
    idParam,
    ...content,
    body('removeImage').optional({ values: 'falsy' }).isIn(['true', 'false', true, false]).withMessage(m.removeImageInvalid).bail().toBoolean()
]

const remove = [idParam]

module.exports = {
    week,
    weeks,
    mine,
    create,
    update,
    remove
}
