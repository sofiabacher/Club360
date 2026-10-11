const bcrypt = require('bcrypt')
const crypto = require('crypto')
const { bcrypt: bcryptConfig, encryption } = require('../config')

// ---------- Irreversible: contraseñas (bcrypt) ----------

const hashPassword = (password) => bcrypt.hash(password, bcryptConfig.saltRounds)

const comparePassword = (password, hash) => bcrypt.compare(password, hash)

// ---------- Reversible: datos sensibles (AES-256-GCM) ----------

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12   // Tamaño recomendado para GCM

function getKey() {
    if (!encryption.key) {
        throw new Error('Falta definir ENCRYPTION_KEY en el .env')
    }

    return crypto.createHash('sha256').update(encryption.key).digest()   // SHA-256: la clave siempre mide 32 bytes
}

// Devuelve 'iv:authTag:contenido' en hex
function encrypt(text) {
    const iv = crypto.randomBytes(IV_LENGTH)
    const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv)

    const content = Buffer.concat([cipher.update(String(text), 'utf8'), cipher.final()])
    const authTag = cipher.getAuthTag()

    return [iv, authTag, content].map(part => part.toString('hex')).join(':')
}

function decrypt(encrypted) {
    const [iv, authTag, content] = String(encrypted).split(':').map(part => Buffer.from(part, 'hex'))

    const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv)
    decipher.setAuthTag(authTag)   // Si el contenido fue alterado, final() lanza un error

    return Buffer.concat([decipher.update(content), decipher.final()]).toString('utf8')
}

module.exports = {
    hashPassword,
    comparePassword,
    encrypt,
    decrypt
}
