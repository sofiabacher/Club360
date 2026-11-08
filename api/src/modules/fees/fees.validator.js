// Validator de fees.
// Reglas de express-validator: solo el formato de los datos, no reglas de negocio.
// Que la cuota sea del socio (o de una vinculada), que esté impaga y que el período no sea futuro lo controla el service.
const { body, param, query } = require('express-validator')
const { FEE_STATES } = require('../../utils/constants')
const { fees: m } = require('../../utils/messages')

const PERIOD_FORMAT = /^\d{4}-(0[1-9]|1[0-2])$/
const PLAYER_STATUSES = ['ok', 'pending', 'overdue']

const idParam = param('id').isInt({ min: 1 }).withMessage(m.idInvalid).bail().toInt()
const searchQuery = query('search').optional().isString().withMessage(m.searchInvalid).bail().isLength({ max: 100 }).withMessage(m.searchInvalid)

// Vencimiento MM/AA sin vencer: la tarjeta vale hasta el último día de ese mes
function isCardExpiryValid(value) {
    const match = /^(0[1-9]|1[0-2])\/(\d{2})$/.exec(String(value ?? ''))
    if (!match) throw new Error(m.cardExpiryInvalid)

    const month = Number(match[1])
    const year = 2000 + Number(match[2])
    const now = new Date()
    if (year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth() + 1)) throw new Error(m.cardExpired)
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
    players
}
