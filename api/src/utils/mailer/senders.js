const transporter = require('../../config/mail')
const logger = require('../logger')

const { cors } = require('../../config')
const { buildRecoveryEmail } = require('./templates')
const { LOG_ACTIONS } = require('../constants')
const { mail } = require('../messages')

async function sendRecoveryEmail(user, token) {   // Mail de recuperación de contraseña
    const link = `${cors.origin}/reset-password?token=${token}`
    const { subject, html } = buildRecoveryEmail({ name: user.name, link })

    try {
        await transporter.sendMail({ to: user.email, subject, html })

    } catch (error) {
        await logger(
            { clubId: user.clubId, userId: user.id, roleId: null },
            LOG_ACTIONS.MAIL_ERROR,
            `${mail.recoveryFailed} a ${user.email}: ${error.message}`
        )

        throw error
    }
}

module.exports = {
    sendRecoveryEmail
}
