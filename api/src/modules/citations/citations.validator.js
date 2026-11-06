// Validator de citations.
// Reglas de express-validator: solo el formato de los datos, no reglas de negocio.
// Que el partido sea Programado y falten 48 horas, la mora y el plazo para responder los controla el service.
const { body, param, query } = require('express-validator')
const { citations: m } = require('../../utils/messages')

const idParam = param('id').isInt({ min: 1 }).withMessage(m.idInvalid).bail().toInt()
const gameIdParam = param('gameId').isInt({ min: 1 }).withMessage(m.idInvalid).bail().toInt()
const scopeQuery = query('scope').optional({ values: 'falsy' }).isIn(['upcoming', 'history']).withMessage(m.scopeInvalid)

const RESPONSES = ['confirm', 'reject']

const coachGames = [
    query('from').optional({ values: 'falsy' }).isDate({ format: 'YYYY-MM-DD', strictMode: true }).withMessage(m.dateInvalid)
]

const byGame = [gameIdParam]

const create = [
    gameIdParam,
    body('memberIds').isArray({ min: 1 }).withMessage(m.memberIdsInvalid),
    body('memberIds.*').isInt({ min: 1 }).withMessage(m.memberIdsInvalid).bail().toInt()
]

const byId = [idParam]

const mine = [scopeQuery]

// Rechazar exige la justificación, de 10 a 300 caracteres (contexto, sección 6)
const respond = [
    idParam,
    body('response').isIn(RESPONSES).withMessage(m.responseInvalid),
    body('justification')
        .if(body('response').equals('reject'))
        .isString().withMessage(m.justificationInvalid).bail()
        .trim()
        .isLength({ min: 10, max: 300 }).withMessage(m.justificationInvalid)
]

const linked = [
    query('memberId').optional({ values: 'falsy' }).isInt({ min: 1 }).withMessage(m.memberIdInvalid),
    scopeQuery
]

module.exports = {
    coachGames,
    byGame,
    create,
    byId,
    mine,
    respond,
    linked
}
