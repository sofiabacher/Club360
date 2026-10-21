const transporter = require('../../config/mail')
const logger = require('../logger')

const { cors } = require('../../config')
const { buildRecoveryEmail, buildPasswordChangedNotice } = require('./templates')
const { LOG_ACTIONS } = require('../constants')
const { mail } = require('../messages')

// Envía el email y, si falla, lo registra en la bitácora (MAIL_ERROR) y relanza el error
async function send(user, { subject, html }, failMessage) {
    try {
        await transporter.sendMail({ to: user.email, subject, html })

    } catch (error) {
        await logger(
            { clubId: user.clubId, userId: user.id, roleId: null },
            LOG_ACTIONS.MAIL_ERROR,
            `${failMessage} a ${user.email}: ${error.message}`
        )

        throw error
    }
}

async function sendRecoveryEmail(user, token) {   // Mail de recuperación de contraseña
    const link = `${cors.origin}/reset-password?token=${encodeURIComponent(token)}`
    await send(user, buildRecoveryEmail({ name: user.name, link }), mail.recoveryFailed)
}

async function sendPasswordChangedNotice(user) {   // Aviso de cambio de contraseña
    await send(user, buildPasswordChangedNotice({ name: user.name }), mail.passwordChangedFailed)
}

module.exports = {
    sendRecoveryEmail,
    sendPasswordChangedNotice
}
