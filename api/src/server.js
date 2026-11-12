// Arranque: chequeo de variables, conexión, sync, jobs y listen.
//
// Render gratis (demo): el servicio se duerme a los 15 minutos sin tráfico y, mientras duerme, no corre ningún job
// (cuotas, citaciones, integridad, backup). En la demo lo mantiene despierto un servicio externo (cron-job.org) que llama
// a GET /health cada 10 minutos (docs/deploy.md). Por eso /health no consulta la base: no genera tráfico en Railway.
const app = require('./app')
const sequelize = require('./config/db')
const jobs = require('./jobs')
const mailTransport = require('./config/mail')
const config = require('./config')

const { app: appConfig } = config

require('./models')   // Registra los modelos y sus asociaciones antes del sync

// Variables sin las que el servidor no arranca en producción
const REQUIRED_IN_PROD = ['DATABASE_URL', 'JWT_SECRET', 'JWT_ACTIVATION_SECRET', 'ENCRYPTION_KEY', 'FRONTEND_URL']
const CLOUDINARY_VARS = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET']

// En producción: corta si falta una variable obligatoria y avisa si falta Cloudinary. Solo muestra los nombres, nunca
// los valores
function checkEnvironment() {
    if (!appConfig.isProd) return

    const missing = REQUIRED_IN_PROD.filter(name => !config.isSet(name))
    if (missing.length > 0) {
        throw new Error(`Faltan variables de entorno obligatorias en producción: ${missing.join(', ')}`)
    }

    const missingCloudinary = CLOUDINARY_VARS.filter(name => !config.isSet(name))
    if (missingCloudinary.length > 0) {
        console.warn(`Aviso: faltan ${missingCloudinary.join(', ')}. Las subidas de archivos van a responder 503 hasta que se carguen`)
    }
}

async function start() {
    try {
        checkEnvironment()

        await sequelize.authenticate()
        console.log('Conexión a la base de datos establecida')

        if (appConfig.isProd && (appConfig.forceSync || appConfig.alterSync)) {
            throw new Error('DB_FORCE_SYNC y DB_ALTER_SYNC no se pueden activar en producción')
        }

        await sequelize.sync({ force: appConfig.forceSync, alter: appConfig.alterSync })
        console.log('Tablas sincronizadas')

        jobs.start()
        checkMail()

        app.listen(appConfig.port, (error) => {   // PORT la define Render
            if (error) {
                console.error('No se pudo iniciar el servidor:', error.message)
                process.exit(1)
            }

            console.log(`API de Club360 escuchando en el puerto ${appConfig.port} (${appConfig.env})`)
        })

    } catch (error) {
        console.error('No se pudo iniciar el servidor:', error.message)
        process.exit(1)
    }
}

// Informa el proveedor de email sin cortar el arranque. Sin proveedor configurado, los emails se muestran por consola
// (en producción, con un aviso: el sistema funciona igual, sin emails)
function checkMail() {
    if (mailTransport.provider === 'console') {
        const reason = mailTransport.problem ?? 'MAIL_PROVIDER=console'
        if (appConfig.isProd) console.warn(`Aviso: ${reason}. Los emails se muestran por consola y no se envían`)
        else console.log(`Emails por consola (${reason})`)
        return
    }

    if (mailTransport.provider === 'brevo') {
        console.log('Emails con la API de Brevo')
        return
    }

    mailTransport.verify()
        .then(() => console.log('Servidor de email (SMTP) listo'))
        .catch(error => console.error('Error con el servidor de email:', error.message))
}

start()
