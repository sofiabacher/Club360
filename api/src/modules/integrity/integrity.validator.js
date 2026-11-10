// Validator de integrity.
// Reglas de express-validator: solo el formato de los datos, no reglas de negocio.
// Que las tablas existan y tengan errores lo controla el service.
const { body } = require('express-validator')
const { integrity: m } = require('../../utils/messages')

// { all: true } o { tables: ['fee', ...] }
const repair = [
    body('all').optional({ values: 'null' }).isBoolean({ strict: true }).withMessage(m.tablesInvalid),
    body('tables')
        .if((value, { req }) => req.body.all !== true)
        .isArray({ min: 1, max: 50 }).withMessage(m.tablesInvalid).bail()
        .custom(tables => tables.every(table => typeof table === 'string' && table.length <= 50)).withMessage(m.tablesInvalid)
]

module.exports = {
    repair
}
