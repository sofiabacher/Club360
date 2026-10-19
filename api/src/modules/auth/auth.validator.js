// Validator de auth.
// Reglas de express-validator: solo el formato de los datos, no reglas de negocio.
const { body } = require('express-validator')
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

module.exports = {
    login,
    registerMember,
    switchRole
}
