// Validator de auth.
// Reglas de express-validator: solo el formato de los datos, no reglas de negocio.
const { body, query } = require('express-validator')
const { auth: m } = require('../../utils/messages')

// Política de contraseñas (igual que HotelDesk): mínimo 8 caracteres, con mayúscula, minúscula, número y carácter especial.
// Se replica en client/src/components/auth/PasswordRequirements.jsx para mostrar los requisitos mientras se escribe.
const PASSWORD_RULES = [
    /^.{8,}$/u,             // Al menos 8 caracteres
    /\p{Lu}/u,              // Una mayúscula
    /\p{Ll}/u,              // Una minúscula
    /\d/,                   // Un número
    /[^\p{L}\p{N}\s]/u      // Un carácter especial (lo que no es letra, número ni espacio)
]

const isValidPassword = (value) => typeof value === 'string' && PASSWORD_RULES.every(rule => rule.test(value))

const login = [
    body('username').isString().withMessage(m.usernameRequired).bail().trim().notEmpty().withMessage(m.usernameRequired),
    body('password').isString().withMessage(m.passwordRequired).bail().notEmpty().withMessage(m.passwordRequired)
]

const registerMember = [
    body('numMember').isString().withMessage(m.numMemberRequired).bail().trim().notEmpty().withMessage(m.numMemberRequired),
    body('birthDate').isDate({ format: 'YYYY-MM-DD', strictMode: true }).withMessage(m.birthDateInvalid),
    body('username')
        .isString().withMessage(m.usernameLength).bail()
        .trim()
        .isLength({ min: 4, max: 50 }).withMessage(m.usernameLength).bail()
        .matches(/^[A-Za-z0-9._]+$/).withMessage(m.usernameFormat),
    body('password').custom(isValidPassword).withMessage(m.passwordPolicy),
    body('confirmPassword').custom((value, { req }) => value === req.body.password).withMessage(m.passwordsDontMatch)
]

const switchRole = [
    body('roleId').isInt({ min: 1 }).withMessage(m.roleIdInvalid).bail().toInt()
]

// Contraseña nueva según la política y su confirmación igual
const newPasswordRules = (field) => [
    body(field).custom(isValidPassword).withMessage(m.passwordPolicy),
    body('confirmPassword').custom((value, { req }) => value === req.body[field]).withMessage(m.passwordsDontMatch)
]

const forgotPassword = [
    body('identifier').isString().withMessage(m.identifierRequired).bail().trim().notEmpty().withMessage(m.identifierRequired)
]

const validateResetToken = [
    query('token').isString().withMessage(m.resetTokenRequired).bail().notEmpty().withMessage(m.resetTokenRequired)
]

const resetPassword = [
    body('token').isString().withMessage(m.resetTokenRequired).bail().notEmpty().withMessage(m.resetTokenRequired),
    ...newPasswordRules('password')
]

// Mi cuenta: solo email y teléfono. Los demás campos del body no se validan porque el service los ignora.
// El email puede venir vacío: que sea obligatorio para los mayores lo decide el service
const updateAccount = [
    body('email').optional({ values: 'falsy' }).isString().withMessage(m.emailInvalid).bail().trim().isEmail().withMessage(m.emailInvalid).bail().isLength({ max: 150 }).withMessage(m.emailInvalid),
    body('phone').optional({ values: 'falsy' }).isString().withMessage(m.phoneLength).bail().trim().isLength({ max: 30 }).withMessage(m.phoneLength)
]

const changePassword = [
    body('currentPassword').isString().withMessage(m.currentPasswordRequired).bail().notEmpty().withMessage(m.currentPasswordRequired),
    ...newPasswordRules('newPassword')
]

module.exports = {
    login,
    registerMember,
    switchRole,
    forgotPassword,
    validateResetToken,
    resetPassword,
    updateAccount,
    changePassword
}
