// Validator de fees.
// Reglas de express-validator: solo el formato de los datos, no reglas de negocio.
// Que la cuota sea del socio (o de una vinculada), que esté impaga y que el período no sea futuro lo controla el service.
const { body, param, query } = require('express-validator')
const { FEE_STATES, TRANSACTION_STATES, PAYMENT_METHODS } = require('../../utils/constants')
const { fees: m } = require('../../utils/messages')
const { today } = require('../../utils/dates')

const PERIOD_FORMAT = /^\d{4}-(0[1-9]|1[0-2])$/
const PLAYER_STATUSES = ['ok', 'pending', 'overdue']
const DATE_FORMAT = /^\d{4}-\d{2}-\d{2}$/

const idParam = param('id').isInt({ min: 1 }).withMessage(m.idInvalid).bail().toInt()
const searchQuery = query('search').optional().isString().withMessage(m.searchInvalid).bail().isLength({ max: 100 }).withMessage(m.searchInvalid)

// Vencimiento MM/AA sin vencer: la tarjeta vale hasta el último día de ese mes (comparado con el mes de Argentina)
function isCardExpiryValid(value) {
    const match = /^(0[1-9]|1[0-2])\/(\d{2})$/.exec(String(value ?? ''))
    if (!match) throw new Error(m.cardExpiryInvalid)

    const month = Number(match[1])
    const year = 2000 + Number(match[2])
    const [currentYear, currentMonth] = today().split('-').map(Number)
    if (year < currentYear || (year === currentYear && month < currentMonth)) throw new Error(m.cardExpired)
    return true
}

const linked = [
    query('memberId').optional({ values: 'falsy' }).isInt({ min: 1 }).withMessage(m.idInvalid)
]

// Los datos de la tarjeta solo se validan: no se guardan
const pay = [
    idParam,
    body('cardNumber').customSanitizer(value => String(value ?? '').replace(/[\s-]/g, '')).matches(/^\d{13,19}$/).withMessage(m.cardNumberInvalid),
    body('cardHolder').isString().withMessage(m.cardHolderInvalid).bail().trim().isLength({ min: 1, max: 100 }).withMessage(m.cardHolderInvalid),
    body('cardExpiry').custom(isCardExpiryValid),
    body('cardCvv').matches(/^\d{3,4}$/).withMessage(m.cardCvvInvalid)
]

const list = [
    query('period').optional({ values: 'falsy' }).matches(PERIOD_FORMAT).withMessage(m.periodInvalid),
    query('state').optional({ values: 'falsy' }).isIn(Object.values(FEE_STATES).map(String)).withMessage(m.stateInvalid),
    searchQuery,
    query('page').optional({ values: 'falsy' }).isInt({ min: 1 }).withMessage(m.pageInvalid)
]

const memberAccount = [
    param('memberId').isInt({ min: 1 }).withMessage(m.idInvalid).bail().toInt()
]

const generate = [
    body('period').matches(PERIOD_FORMAT).withMessage(m.periodInvalid)
]

const registerPayment = [
    idParam,
    body('note').optional({ values: 'null' }).isString().withMessage(m.noteInvalid).bail().trim().isLength({ max: 300 }).withMessage(m.noteInvalid)
]

// El archivo del comprobante (campo receipt) lo controla el middleware upload; que haya llegado, el service
const transfer = [idParam]

// Fecha AAAA-MM-DD que existe en el calendario
const dateQuery = (field) => query(field).optional({ values: 'falsy' })
    .custom(value => DATE_FORMAT.test(value) && !isNaN(new Date(`${value}T12:00:00Z`)) && new Date(`${value}T12:00:00Z`).toISOString().startsWith(value))
    .withMessage(m.dateInvalid)

const payments = [
    query('method').optional({ values: 'falsy' }).isIn(Object.values(PAYMENT_METHODS).map(String)).withMessage(m.methodInvalid),
    query('state').optional({ values: 'falsy' }).isIn(Object.values(TRANSACTION_STATES).map(String)).withMessage(m.stateInvalid),
    searchQuery,
    dateQuery('from'),
    dateQuery('to').custom((value, { req }) => !value || !req.query.from || req.query.from <= value).withMessage(m.dateRangeInvalid),
    query('page').optional({ values: 'falsy' }).isInt({ min: 1 }).withMessage(m.pageInvalid)
]

const paymentId = [idParam]

const reject = [
    idParam,
    body('reason').isString().withMessage(m.reasonInvalid).bail().trim().isLength({ min: 10, max: 300 }).withMessage(m.reasonInvalid)
]

const players = [
    query('status').optional({ values: 'falsy' }).isIn(PLAYER_STATUSES).withMessage(m.statusInvalid),
    searchQuery
]

module.exports = {
    linked,
    pay,
    list,
    memberAccount,
    generate,
    registerPayment,
    transfer,
    payments,
    paymentId,
    reject,
    players
}
