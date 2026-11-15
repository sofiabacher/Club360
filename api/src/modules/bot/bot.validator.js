// Validator de bot.
// Reglas de express-validator: solo el formato de los datos. Qué intención responde, si es visible para el grupo y si el
// texto tiene datos personales lo controla el service.
const { body, query } = require('express-validator')
const { BOT_MAX_MESSAGE_LENGTH } = require('../../utils/constants')
const { bot: m } = require('../../utils/messages')

// La pantalla es la ruta del front sin la barra inicial ("my-fees", "family/fees")
const SCREEN_FORMAT = /^[a-z0-9\-/]{0,100}$/

const menu = [
    query('screen').optional({ values: 'falsy' }).matches(SCREEN_FORMAT).withMessage(m.screenInvalid)
]

const chat = [
    body('type').isIn(['text', 'button']).withMessage(m.typeInvalid),
    body('message')
        .if(body('type').equals('text'))
        .isString().withMessage(m.messageInvalid).bail()
        .trim()
        .isLength({ min: 1, max: BOT_MAX_MESSAGE_LENGTH }).withMessage(m.messageInvalid),
    body('intent')
        .if(body('type').equals('button'))
        .isString().withMessage(m.intentInvalid).bail()
        .matches(/^[a-z_]{1,50}$/).withMessage(m.intentInvalid),
    body('screen').optional({ values: 'falsy' }).isString().withMessage(m.screenInvalid).bail().matches(SCREEN_FORMAT).withMessage(m.screenInvalid)
]

const feedback = [
    body('interactionId').isUUID().withMessage(m.interactionIdInvalid),
    body('useful').isBoolean({ strict: true }).withMessage(m.usefulInvalid)
]

module.exports = {
    menu,
    chat,
    feedback
}
