// Único lugar del backend que lee process.env. El resto de los archivos importa desde acá.
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '../../.env') })

const env = process.env.NODE_ENV || 'development'

module.exports = {
    app: {
        env,
        port: parseInt(process.env.PORT, 10) || 3000,
        isDev: env === 'development',
        isProd: env === 'production',
        forceSync: process.env.DB_FORCE_SYNC === 'true',
        alterSync: process.env.DB_ALTER_SYNC === 'true'
    },

    db: {
        url: process.env.DATABASE_URL,   // Base en la nube (demo). Si existe, tiene prioridad
        name: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT, 10) || 3306
    },

    bcrypt: {
        saltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 10
    },

    jwt: {
        secret: process.env.JWT_SECRET,
        activationSecret: process.env.JWT_ACTIVATION_SECRET,
        expiresIn: process.env.JWT_EXPIRES_IN || '24h',
        emailExpiresIn: process.env.JWT_EMAIL_EXPIRES_IN || '1h'
    },

    encryption: {
        key: process.env.ENCRYPTION_KEY
    },

    email: {
        apiKey: process.env.RESEND_API_KEY,
        from: process.env.EMAIL_FROM
    },

    cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:5173'
    }
}
