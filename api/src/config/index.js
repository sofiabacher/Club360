// Único lugar del backend que lee process.env. El resto de los archivos importa desde acá.
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '../../.env') })

const env = process.env.NODE_ENV || 'development'

// FRONTEND_URL sin la barra final, para que coincida con el Origin del navegador y los links no queden con '//'
const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, '')

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
        url: process.env.DATABASE_URL?.trim() || undefined,   // Base en la nube (demo). Si existe, tiene prioridad
        ssl: process.env.DB_SSL !== 'false',   // Solo se usa con DATABASE_URL. Con DB_SSL=false se conecta sin SSL
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
        emailExpiresIn: process.env.JWT_EMAIL_EXPIRES_IN || '1h',
        activationExpiresIn: process.env.JWT_ACTIVATION_EXPIRES_IN || '48h'   // Link de activación de la cuenta del staff
    },

    encryption: {
        key: process.env.ENCRYPTION_KEY
    },

    // Emails (config/mail.js). provider: 'brevo', 'smtp' o 'console'; sin MAIL_PROVIDER se elige según las credenciales
    mail: {
        provider: process.env.MAIL_PROVIDER?.trim().toLowerCase() || null,
        from: process.env.MAIL_FROM || process.env.SMTP_USER,   // Casilla remitente (en Brevo, la verificada)
        fromName: process.env.MAIL_FROM_NAME || 'Club360',
        brevoApiKey: process.env.BREVO_API_KEY
    },

    // Gmail SMTP con nodemailer, solo para el desarrollo local (Render gratis bloquea los puertos SMTP).
    // pass es una contraseña de aplicación de Gmail, no la de la cuenta
    smtp: (() => {
        const port = parseInt(process.env.SMTP_PORT, 10) || 465
        return {
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port,
            secure: port === 465,   // 465: SSL directo; 587: STARTTLS
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    })(),

    // Archivos subidos en producción (middlewares/upload.js). Sin las tres, las subidas en producción responden 503
    cloudinary: {
        cloudName: process.env.CLOUDINARY_CLOUD_NAME,
        apiKey: process.env.CLOUDINARY_API_KEY,
        apiSecret: process.env.CLOUDINARY_API_SECRET,
        isConfigured: Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET)
    },

    cors: {
        origin: frontendUrl   // También es la base de los links de los emails
    },

    // true si la variable está cargada (no vacía). Lo usa el chequeo de arranque de server.js, que muestra solo el nombre
    isSet: (name) => Boolean(process.env[name]?.trim()),

    seed: {
        admin: {   // Usuario Admin que crea el seed. La contraseña no tiene valor por defecto
            name: process.env.SEED_ADMIN_NAME || 'Admin',
            lastName: process.env.SEED_ADMIN_LASTNAME || 'Valencia',
            email: process.env.SEED_ADMIN_EMAIL || 'admin@valencia-club.com',
            username: process.env.SEED_ADMIN_USERNAME || 'admin.valencia',
            password: process.env.SEED_ADMIN_PASSWORD,
            birthDate: process.env.SEED_ADMIN_BIRTHDATE || '1990-01-01'
        },

        // Datos de la demo (npm run seed:demo). password: la de todos los usuarios de la demo (no la del Admin).
        // email: casilla del equipo para los alias (casilla+usuario@...). realEmails: 'clave=email,clave=email' (texto crudo)
        demo: {
            password: process.env.SEED_DEMO_PASSWORD,
            email: process.env.SEED_DEMO_EMAIL?.trim() || null,
            realEmails: process.env.SEED_DEMO_REAL_EMAILS?.trim() || ''
        }
    }
}
