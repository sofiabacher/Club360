const app = require('./app')
const sequelize = require('./config/db')
const jobs = require('./jobs')
const mailTransport = require('./config/mail')
const { app: appConfig } = require('./config')

require('./models')   // Registra los modelos y sus asociaciones antes del sync

async function start() {
    try {
        await sequelize.authenticate()
        console.log('Conexión a la base de datos establecida')

        if (appConfig.isProd && (appConfig.forceSync || appConfig.alterSync)) {
            throw new Error('DB_FORCE_SYNC y DB_ALTER_SYNC no se pueden activar en producción')
        }

        await sequelize.sync({ force: appConfig.forceSync, alter: appConfig.alterSync })
        console.log('Tablas sincronizadas')

        jobs.start()
        checkMail()

        app.listen(appConfig.port, (error) => {
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

// Comprueba el servidor de email sin cortar el arranque. Sin credenciales: en desarrollo los emails van por consola;
// en producción se avisa, porque los envíos van a fallar
function checkMail() {
    if (!mailTransport.hasCredentials) {
        if (appConfig.isProd) console.error('Faltan SMTP_USER o SMTP_PASS: no se van a poder enviar emails')
        else console.log('Emails por consola (sin SMTP_USER o SMTP_PASS)')
        return
    }

    mailTransport.verify()
        .then(() => console.log('Servidor de email listo'))
        .catch(error => console.error('Error con el servidor de email:', error.message))
}

start()
