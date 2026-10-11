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

// Token de los links que se envían por email (ej. recuperación de contraseña)
function generateEmailToken(userId) {
    return jwt.sign({ userId }, jwtConfig.activationSecret, { expiresIn: jwtConfig.emailExpiresIn })
}

function verifyEmailToken(token) {
    try {
        const payload = jwt.verify(token, jwtConfig.activationSecret)
        return { valid: true, payload }

    } catch (error) {
        return { valid: false, error: error.message }
    }
}

module.exports = {
    generateLoginToken,
    verifySessionToken,
    generateEmailToken,
    verifyEmailToken
}
