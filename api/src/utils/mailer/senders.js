const transporter = require('../../config/mail')
const logger = require('../logger')

const { cors, jwt: jwtConfig } = require('../../config')
const { buildRecoveryEmail, buildPasswordChangedNotice, buildActivationEmail, buildNotificationEmail } = require('./templates')
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

// Vencimiento de JWT_ACTIVATION_EXPIRES_IN en palabras: '48h' → '48 horas', '2d' → '2 días'
function durationText(value) {
    const [, amount, unit] = String(value).match(/^(\d+)\s*([hd])$/) ?? []
    if (!amount) return String(value)

    const count = Number(amount)
    if (unit === 'd') return `${count} ${count === 1 ? 'día' : 'días'}`
    return `${count} ${count === 1 ? 'hora' : 'horas'}`
}

async function sendActivationEmail(user, token, clubName) {   // Activación de la cuenta del staff
    const link = `${cors.origin}/activate?token=${encodeURIComponent(token)}`
    const expiresIn = durationText(jwtConfig.activationExpiresIn)
    await send(user, buildActivationEmail({ name: user.name, clubName, link, expiresIn }), mail.activationFailed)
}

// Email de una notificación (lo usa solo notify()). notification: { clubName, title, message }
async function sendNotificationEmail(user, notification) {
    const link = `${cors.origin}/notifications`
    await send(user, buildNotificationEmail({ ...notification, link }), mail.notificationFailed)
}

module.exports = {
    sendRecoveryEmail,
    sendPasswordChangedNotice,
    sendActivationEmail,
    sendNotificationEmail
}
