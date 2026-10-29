// Validator de leagues.
// Reglas de express-validator: solo el formato de los datos, no reglas de negocio.
// Que el grupo de edad sea de la escala de la liga lo controla el service, porque depende de la liga.
const { body, param, query } = require('express-validator')
const { AGE_SCALES } = require('../../utils/constants')
const { leagues: m } = require('../../utils/messages')

const idParam = (name = 'id') => param(name).isInt({ min: 1 }).withMessage(m.idInvalid).bail().toInt()

const leagueName = body('name').isString().withMessage(m.nameInvalid).bail().trim().isLength({ min: 1, max: 100 }).withMessage(m.nameInvalid)
const ageScale = body('ageScale').isIn(Object.keys(AGE_SCALES).map(Number)).withMessage(m.ageScaleInvalid).bail().toInt()

// Lista de ids enteros, sin vacíos
const idList = (field, message) => [
    body(field).isArray({ min: 1, max: 100 }).withMessage(message),
    body(`${field}.*`).isInt({ min: 1 }).withMessage(message).bail().toInt()
]

const list = [
    query('includeInactive').optional().isIn(['true', 'false']).withMessage(m.includeInactiveInvalid)
]

const byId = [idParam()]

const createLeague = [
    leagueName,
    body('clubSportId').isInt({ min: 1 }).withMessage(m.clubSportIdInvalid).bail().toInt(),
    ageScale
]

const updateLeague = [idParam(), leagueName, ageScale]

// El nombre es opcional: sin nombre se usa la etiqueta del grupo
const createCategory = [
    idParam(),
    body('ageGroup').isString().withMessage(m.ageGroupRequired).bail().trim().notEmpty().withMessage(m.ageGroupRequired),
    body('name').optional({ values: 'falsy' }).isString().withMessage(m.categoryNameInvalid).bail().trim().isLength({ max: 100 }).withMessage(m.categoryNameInvalid)
]

const updateCategory = [idParam(), leagueName]

const eligiblePlayers = [
    idParam(),
    query('search').optional().isString().withMessage(m.searchLength).bail().trim().isLength({ max: 100 }).withMessage(m.searchLength)
]

const assignPlayers = [idParam(), ...idList('memberIds', m.memberIdsInvalid)]
const assignStaff = [idParam(), ...idList('staffIds', m.staffIdsInvalid)]

const unassignPlayer = [idParam(), idParam('memberId')]
const unassignStaff = [idParam(), idParam('staffId')]

module.exports = {
    list,
    byId,
    createLeague,
    updateLeague,
    createCategory,
    updateCategory,
    eligiblePlayers,
    assignPlayers,
    assignStaff,
    unassignPlayer,
    unassignStaff
}
