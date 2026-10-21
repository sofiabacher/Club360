const crypto = require('crypto')
const jwt = require('jsonwebtoken')
const { jwt: jwtConfig } = require('../config')

// Token de sesión. Cambiar de rol activo genera un token nuevo.
function generateLoginToken({ id, clubId, activeRoleId }) {
    return jwt.sign({ id, clubId, activeRoleId }, jwtConfig.secret, { expiresIn: jwtConfig.expiresIn })
}

function verifySessionToken(token) {
    try {
        const payload = jwt.verify(token, jwtConfig.secret)
        return { valid: true, payload }

    } catch (error) {
        return { valid: false, error: error.message }
    }
}

// ---------- Recuperación de contraseña ----------
//
// El link sirve una sola vez sin guardar nada en la base: el token lleva una huella (`pwd`) del hash de la contraseña
// que el usuario tenía cuando lo pidió. Apenas cambia la contraseña, el hash cambia y la huella deja de coincidir, así que
// el mismo link (y cualquier otro pedido antes) queda invalidado solo. Vence a JWT_EMAIL_EXPIRES_IN (1 hora).
// `purpose` evita que se use para esto un token firmado con el mismo secreto para otra cosa.

const PASSWORD_RESET_PURPOSE = 'password-reset'

// Primeros 16 caracteres del SHA-256 del hash de la contraseña: identifica la contraseña actual sin exponer el hash
const passwordFingerprint = (passwordHash) => crypto.createHash('sha256').update(String(passwordHash)).digest('hex').slice(0, 16)

function generatePasswordResetToken(user) {
    const payload = { userId: user.id, purpose: PASSWORD_RESET_PURPOSE, pwd: passwordFingerprint(user.password) }
    return jwt.sign(payload, jwtConfig.activationSecret, { expiresIn: jwtConfig.emailExpiresIn })
}

// Firma, vencimiento y propósito. Devuelve el id del usuario (para buscarlo) o null si el token no sirve
function getPasswordResetUserId(token) {
    try {
        const payload = jwt.verify(String(token), jwtConfig.activationSecret)
        return payload.purpose === PASSWORD_RESET_PURPOSE ? payload.userId : null

    } catch {
        return null
    }
}

// Verificación completa: firma, vencimiento, propósito y que la huella coincida con la contraseña ACTUAL del usuario
function verifyPasswordResetToken(token, user) {
    try {
        const payload = jwt.verify(String(token), jwtConfig.activationSecret)

        const valid = payload.purpose === PASSWORD_RESET_PURPOSE
            && Boolean(user?.password)
            && payload.userId === user.id
            && payload.pwd === passwordFingerprint(user.password)

        return valid ? { valid: true, payload } : { valid: false }

    } catch (error) {
        return { valid: false, error: error.message }
    }
}

module.exports = {
    generateLoginToken,
    verifySessionToken,
    generatePasswordResetToken,
    getPasswordResetUserId,
    verifyPasswordResetToken
}
