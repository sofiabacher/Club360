// Validator de inscriptions.
// Reglas de express-validator: solo el formato de los datos, no reglas de negocio.
// Que el socio esté activo, el deporte activo y no haya otra inscripción abierta lo controla el service.
const { body, param, query } = require('express-validator')
const { INSCRIPTION_STATES } = require('../../utils/constants')
const { inscriptions: m } = require('../../utils/messages')

const STATE_FILTERS = [...Object.values(INSCRIPTION_STATES).map(String), 'history']

const idParam = param('id').isInt({ min: 1 }).withMessage(m.idInvalid).bail().toInt()

const request = [
    body('clubSportId').isInt({ min: 1 }).withMessage(m.clubSportIdInvalid).bail().toInt()
]

const byId = [idParam]

const list = [
    query('state').optional({ values: 'falsy' }).isIn(STATE_FILTERS).withMessage(m.stateInvalid),
    query('clubSportId').optional({ values: 'falsy' }).isInt({ min: 1 }).withMessage(m.clubSportIdInvalid),
    query('search').optional().isString().withMessage(m.searchInvalid).bail().isLength({ max: 100 }).withMessage(m.searchInvalid),
    query('page').optional({ values: 'falsy' }).isInt({ min: 1 }).withMessage(m.pageInvalid)
]

// El motivo del rechazo es opcional, hasta 300 caracteres
const reject = [
    idParam,
    body('reason').optional({ values: 'null' }).isString().withMessage(m.reasonInvalid).bail().trim().isLength({ max: 300 }).withMessage(m.reasonInvalid)
]

module.exports = {
    request,
    byId,
    list,
    reject
}
