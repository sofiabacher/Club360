// Validator de routines.
// Reglas de express-validator: solo el formato de los datos, no reglas de negocio.
// Que la categoría esté en el alcance, que la semana sea editable y que el día esté libre lo controla el service.
const { body, param, query } = require('express-validator')
const { isoDayOfWeek } = require('../../utils/dates')
const { ROUTINE_DAYS, ROUTINE_LOG_STATUS, GOAL_STATES } = require('../../utils/constants')
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

// ---------- Seguimiento personal (P20) ----------
// Que el esfuerzo sea obligatorio según el estado, la ventana de 7 días y las reglas de los objetivos las controla el service

const isDate = (value) => DATE_FORMAT.test(String(value)) && !isNaN(new Date(`${value}T12:00:00Z`)) && new Date(`${value}T12:00:00Z`).toISOString().startsWith(value)

const weeksQuery = query('weeks').optional({ values: 'falsy' }).isInt({ min: 1, max: 26 }).withMessage(m.weeksInvalid)

const log = [
    idParam,
    body('status').isIn(Object.values(ROUTINE_LOG_STATUS).map(String)).withMessage(m.statusInvalid).bail().toInt(),
    body('effort').optional({ values: 'null' }).isInt().withMessage(m.effortInvalid),
    body('note').optional({ values: 'null' }).isString().withMessage(m.noteInvalid).bail().isLength({ max: 300 }).withMessage(m.noteInvalid)
]

const progress = [weeksQuery]

const goalText = body('text').isString().withMessage(m.goalTextInvalid).bail().trim().isLength({ min: 5, max: 200 }).withMessage(m.goalTextInvalid)
const goalDueDate = body('dueDate').custom(isDate).withMessage(m.goalDueDateInvalid)

const goals = [query('state').optional({ values: 'falsy' }).isIn(Object.values(GOAL_STATES).map(String)).withMessage(m.goalStateInvalid)]

const createGoal = [goalText, goalDueDate]

const updateGoal = [idParam, goalText, goalDueDate]

const goalState = [
    idParam,
    body('goalState').isIn(Object.values(GOAL_STATES).map(String)).withMessage(m.goalStateInvalid).bail().toInt(),
    body('dueDate').optional({ values: 'falsy' }).custom(isDate).withMessage(m.goalDueDateInvalid)
]

const tracking = [query('categoryId').optional({ values: 'falsy' }).isInt({ min: 1 }).withMessage(m.categoryInvalid), weekStartQuery]

const memberTracking = [param('memberId').isInt({ min: 1 }).withMessage(m.memberIdInvalid).bail().toInt(), weeksQuery]

module.exports = {
    week,
    weeks,
    mine,
    create,
    update,
    remove,
    log,
    progress,
    goals,
    createGoal,
    updateGoal,
    goalState,
    tracking,
    memberTracking
}
