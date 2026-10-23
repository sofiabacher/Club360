// Validator de clubs.
// Reglas de express-validator: solo el formato de los datos, no reglas de negocio.
const { body, param } = require('express-validator')
const { clubs: m } = require('../../utils/messages')

// Máximo de DECIMAL(10, 2)
const MAX_AMOUNT = 99999999.99

// Texto obligatorio de hasta `max` caracteres
const requiredText = (field, max, message) => body(field)
    .isString().withMessage(message).bail()
    .trim()
    .isLength({ min: 1, max }).withMessage(message)

// Lista de objetos con dos textos obligatorios (canchas y horarios de entrenamiento)
const pairList = (field, [first, second], message) => [
    body(field).optional({ values: 'null' }).isArray({ max: 20 }).withMessage(message),
    body(`${field}.*`).isObject({ strict: true }).withMessage(message),
    requiredText(`${field}.*.${first}`, 100, message),
    requiredText(`${field}.*.${second}`, 100, message)
]

const EXTRA_INFO_KEYS = ['whatsapp', 'secretaryHours', 'courts', 'trainingSchedule']

// extraInfo (estructura comentada en el modelo Club): todas las claves son opcionales y no se aceptan otras
const extraInfo = [
    body('extraInfo')
        .optional({ values: 'null' })
        .isObject({ strict: true }).withMessage(m.extraInfoInvalid).bail()
        .custom(value => Object.keys(value).every(key => EXTRA_INFO_KEYS.includes(key))).withMessage(m.extraInfoInvalid),
    body('extraInfo.whatsapp').optional({ values: 'falsy' }).isString().withMessage(m.whatsappInvalid).bail().trim().isLength({ max: 30 }).withMessage(m.whatsappInvalid),
    body('extraInfo.secretaryHours').optional({ values: 'null' }).isArray({ max: 10 }).withMessage(m.secretaryHoursInvalid),
    requiredText('extraInfo.secretaryHours.*', 100, m.secretaryHoursInvalid),
    ...pairList('extraInfo.courts', ['name', 'address'], m.courtsInvalid),
    ...pairList('extraInfo.trainingSchedule', ['sport', 'schedule'], m.trainingScheduleInvalid)
]

const updateSettings = [
    body('socialFee').isFloat({ gt: 0, max: MAX_AMOUNT }).withMessage(m.socialFeeInvalid).bail().toFloat(),
    body('delayFee').isInt({ min: 1, max: 3650 }).withMessage(m.delayFeeInvalid).bail().toInt(),
    body('conflictMargin').isInt({ min: 0, max: 1440 }).withMessage(m.conflictMarginInvalid).bail().toInt(),
    requiredText('address', 100, m.addressInvalid),
    body('phone').optional({ values: 'falsy' }).isString().withMessage(m.phoneInvalid).bail().trim().isLength({ max: 30 }).withMessage(m.phoneInvalid),
    body('email').isString().withMessage(m.emailInvalid).bail().trim().isEmail().withMessage(m.emailInvalid).bail().isLength({ max: 100 }).withMessage(m.emailInvalid),
    body('accentColor').isString().withMessage(m.accentColorInvalid).bail().trim().matches(/^#[0-9A-Fa-f]{6}$/).withMessage(m.accentColorInvalid),
    ...extraInfo
]

const updateSport = [
    param('sportId').isInt({ min: 1 }).withMessage(m.idInvalid).bail().toInt(),
    body('isActive').isBoolean({ strict: true }).withMessage(m.isActiveInvalid),
    body('priceFee').optional({ values: 'null' }).isFloat({ gt: 0, max: MAX_AMOUNT }).withMessage(m.priceFeeInvalid).bail().toFloat()
]

module.exports = {
    updateSettings,
    updateSport
}
