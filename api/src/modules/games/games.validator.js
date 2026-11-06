// Validator de games.
// Reglas de express-validator: solo el formato de los datos, no reglas de negocio.
// Que la fecha sea futura y la categoría esté activa y en el alcance lo controla el service.
const { body, param, query } = require('express-validator')
const { GAME_STATES } = require('../../utils/constants')
const { games: m } = require('../../utils/messages')

const idParam = param('id').isInt({ min: 1 }).withMessage(m.idInvalid).bail().toInt()

const isoDateTime = (field) => body(field).isISO8601({ strict: true }).withMessage(m.dateTimeInvalid)
const dateQuery = (field) => query(field).optional({ values: 'falsy' }).isDate({ format: 'YYYY-MM-DD', strictMode: true }).withMessage(m.dateInvalid)

// Datos del partido que se pueden cargar y editar (la categoría solo al crear)
const gameData = [
    body('rival').isString().withMessage(m.rivalInvalid).bail().trim().isLength({ min: 1, max: 100 }).withMessage(m.rivalInvalid),
    isoDateTime('dateTime'),
    body('isHome').isBoolean({ strict: true }).withMessage(m.isHomeInvalid),
    body('address').isString().withMessage(m.addressInvalid).bail().trim().isLength({ min: 1, max: 200 }).withMessage(m.addressInvalid)
]

const categoryId = body('categoryId').isInt({ min: 1 }).withMessage(m.categoryIdInvalid).bail().toInt()

const list = [
    query('categoryId').optional({ values: 'falsy' }).isInt({ min: 1 }).withMessage(m.categoryIdInvalid),
    query('state').optional({ values: 'falsy' }).isIn(Object.values(GAME_STATES).map(String)).withMessage(m.stateInvalid),
    dateQuery('from'),
    dateQuery('to'),
    query('page').optional().isInt({ min: 1 }).withMessage(m.pageInvalid)
]

const range = [dateQuery('from'), dateQuery('to')]

const byId = [idParam]

const create = [categoryId, ...gameData]

const update = [idParam, ...gameData]

const checkConflicts = [
    body('gameId').optional({ values: 'null' }).isInt({ min: 1 }).withMessage(m.idInvalid).bail().toInt(),
    body('categoryId').if(body('gameId').not().exists()).isInt({ min: 1 }).withMessage(m.categoryIdInvalid).bail().toInt(),
    isoDateTime('dateTime')
]

const cancel = [
    idParam,
    body('reason').optional({ values: 'falsy' }).isString().withMessage(m.reasonInvalid).bail().trim().isLength({ max: 300 }).withMessage(m.reasonInvalid)
]

const resolve = [
    body('memberId').isInt({ min: 1 }).withMessage(m.memberIdInvalid).bail().toInt(),
    body('gameIds').isArray({ min: 2, max: 2 }).withMessage(m.gameIdsInvalid),
    body('gameIds.*').isInt({ min: 1 }).withMessage(m.gameIdsInvalid).bail().toInt(),
    body('chosenGameId').isInt({ min: 1 }).withMessage(m.chosenGameInvalid).bail().toInt(),
    body('note').optional({ values: 'falsy' }).isString().withMessage(m.noteInvalid).bail().trim().isLength({ max: 300 }).withMessage(m.noteInvalid)
]

const linked = [
    query('memberId').optional({ values: 'falsy' }).isInt({ min: 1 }).withMessage(m.memberIdInvalid),
    ...range
]

module.exports = {
    list,
    range,
    byId,
    create,
    update,
    checkConflicts,
    cancel,
    resolve,
    linked
}
