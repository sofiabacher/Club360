// Validator de logs.
// Reglas de express-validator: solo el formato de los datos, no reglas de negocio.
const { query } = require('express-validator')
const { CRITICITY } = require('../../utils/constants')
const { logs: m } = require('../../utils/messages')

const DATE_FORMAT = /^\d{4}-\d{2}-\d{2}$/

// Fecha AAAA-MM-DD que existe en el calendario
const isDate = (value) => DATE_FORMAT.test(String(value)) && new Date(`${value}T12:00:00Z`).toISOString().startsWith(value)

// Los filtros de la bitácora (los mismos para el listado y el CSV)
const filters = [
    query('from').optional({ values: 'falsy' }).custom(isDate).withMessage(m.dateInvalid),
    query('to').optional({ values: 'falsy' }).custom(isDate).withMessage(m.dateInvalid).bail()
        .custom((value, { req }) => !req.query.from || !isDate(req.query.from) || req.query.from <= value).withMessage(m.dateRangeInvalid),
    query('criticity').optional({ values: 'falsy' }).isIn(Object.values(CRITICITY).map(String)).withMessage(m.criticityInvalid),
    query('action').optional({ values: 'falsy' }).isString().withMessage(m.actionInvalid).bail().isLength({ max: 50 }).withMessage(m.actionInvalid),
    query('userId').optional({ values: 'falsy' }).isInt({ min: 1 }).withMessage(m.userIdInvalid),
    query('search').optional({ values: 'falsy' }).isString().withMessage(m.searchInvalid).bail().isLength({ max: 100 }).withMessage(m.searchInvalid)
]

const list = [
    ...filters,
    query('page').optional({ values: 'falsy' }).isInt({ min: 1 }).withMessage(m.pageInvalid)
]

module.exports = {
    list,
    exportCsv: filters
}
