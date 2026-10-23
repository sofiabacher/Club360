// Validator de members.
// Reglas de express-validator: solo el formato de los datos, no reglas de negocio.
// Que el email sea obligatorio para los mayores lo decide el service, porque depende de la fecha de nacimiento.
const { body, param, query } = require('express-validator')
const { today } = require('../../utils/dates')
const { MEMBER_STATES } = require('../../utils/constants')
const { members: m } = require('../../utils/messages')

const idParam = param('id').isInt({ min: 1 }).withMessage(m.idInvalid).bail().toInt()

const requiredText = (field, max, message) => body(field)
    .isString().withMessage(message).bail()
    .trim()
    .isLength({ min: 1, max }).withMessage(message)

// Datos personales del alta y de la modificación
const personalData = [
    requiredText('name', 100, m.nameInvalid),
    requiredText('lastName', 100, m.lastNameInvalid),
    body('dni').isString().withMessage(m.dniInvalid).bail().trim().matches(/^\d{7,8}$/).withMessage(m.dniInvalid),
    body('birthDate')
        .isDate({ format: 'YYYY-MM-DD', strictMode: true }).withMessage(m.birthDateInvalid).bail()
        .custom(value => value <= today()).withMessage(m.birthDateInvalid),
    body('email').optional({ values: 'falsy' }).isString().withMessage(m.emailInvalid).bail().trim().isEmail().withMessage(m.emailInvalid).bail().isLength({ max: 150 }).withMessage(m.emailInvalid),
    body('phone').optional({ values: 'falsy' }).isString().withMessage(m.phoneInvalid).bail().trim().isLength({ max: 30 }).withMessage(m.phoneInvalid)
]

const list = [
    query('search').optional().isString().withMessage(m.searchLength).bail().trim().isLength({ max: 100 }).withMessage(m.searchLength),
    query('state').optional({ values: 'falsy' }).isIn(Object.values(MEMBER_STATES).map(String)).withMessage(m.stateInvalid),
    query('registration').optional({ values: 'falsy' }).isIn(['pending', 'registered']).withMessage(m.registrationInvalid),
    query('page').optional().isInt({ min: 1 }).withMessage(m.pageInvalid)
]

const byId = [idParam]

const create = [
    ...personalData,
    body('existingUserId').optional({ values: 'null' }).isInt({ min: 1 }).withMessage(m.existingUserIdInvalid).bail().toInt()
]

// Mismas reglas que login y registro para el nombre de usuario (solo se puede cambiar si el socio ya se registró)
const update = [
    idParam,
    ...personalData,
    body('username')
        .optional({ values: 'falsy' })
        .isString().withMessage(m.usernameLength).bail()
        .trim()
        .isLength({ min: 4, max: 50 }).withMessage(m.usernameLength).bail()
        .matches(/^[A-Za-z0-9._]+$/).withMessage(m.usernameFormat)
]

module.exports = {
    list,
    byId,
    create,
    update
}
