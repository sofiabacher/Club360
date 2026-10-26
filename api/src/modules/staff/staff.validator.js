// Validator de staff.
// Reglas de express-validator: solo el formato de los datos, no reglas de negocio.
const { body, param, query } = require('express-validator')
const { today } = require('../../utils/dates')
const { STAFF_ROLES } = require('../../utils/constants')
const { staff: m } = require('../../utils/messages')

const idParam = param('id').isInt({ min: 1 }).withMessage(m.idInvalid).bail().toInt()

const requiredText = (field, max, message) => body(field)
    .isString().withMessage(message).bail()
    .trim()
    .isLength({ min: 1, max }).withMessage(message)

// Al menos un rol, todos de STAFF_ROLES y sin repetir
const staffRoles = body('roles')
    .isArray({ min: 1, max: STAFF_ROLES.length }).withMessage(m.rolesInvalid).bail()
    .custom(roles => roles.every(role => STAFF_ROLES.includes(role)) && new Set(roles).size === roles.length).withMessage(m.rolesInvalid)

// Datos del alta y de la modificación. El email es obligatorio: por ahí recibe la activación de su cuenta
const staffData = [
    requiredText('name', 100, m.nameInvalid),
    requiredText('lastName', 100, m.lastNameInvalid),
    body('dni').isString().withMessage(m.dniInvalid).bail().trim().matches(/^\d{7,8}$/).withMessage(m.dniInvalid),
    body('birthDate')
        .isDate({ format: 'YYYY-MM-DD', strictMode: true }).withMessage(m.birthDateInvalid).bail()
        .custom(value => value <= today()).withMessage(m.birthDateInvalid),
    body('email').isString().withMessage(m.emailInvalid).bail().trim().isEmail().withMessage(m.emailInvalid).bail().isLength({ max: 150 }).withMessage(m.emailInvalid),
    body('phone').optional({ values: 'falsy' }).isString().withMessage(m.phoneInvalid).bail().trim().isLength({ max: 30 }).withMessage(m.phoneInvalid),
    staffRoles,
    body('clubSportId').isInt({ min: 1 }).withMessage(m.clubSportIdInvalid).bail().toInt()
]

const list = [
    query('search').optional().isString().withMessage(m.searchLength).bail().trim().isLength({ max: 100 }).withMessage(m.searchLength),
    query('role').optional({ values: 'falsy' }).isIn(STAFF_ROLES).withMessage(m.roleInvalid),
    query('state').optional({ values: 'falsy' }).isIn(['active', 'pending', 'inactive']).withMessage(m.stateInvalid),
    query('page').optional().isInt({ min: 1 }).withMessage(m.pageInvalid)
]

const byId = [idParam]

const create = [
    ...staffData,
    body('existingUserId').optional({ values: 'null' }).isInt({ min: 1 }).withMessage(m.existingUserIdInvalid).bail().toInt()
]

// Mismas reglas que login y registro para el nombre de usuario (solo se puede cambiar si ya activó su cuenta)
const update = [
    idParam,
    ...staffData,
    body('username')
        .optional({ values: 'falsy' })
        .isString().withMessage(m.usernameLength).bail()
        .trim()
        .isLength({ min: 4, max: 50 }).withMessage(m.usernameLength).bail()
        .matches(/^[A-Za-z0-9._]+$/).withMessage(m.usernameFormat)
]

const reactivate = [idParam, staffRoles]

module.exports = {
    list,
    byId,
    create,
    update,
    reactivate
}
