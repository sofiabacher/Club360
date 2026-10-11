const app = require('./app')
const sequelize = require('./config/db')
const jobs = require('./jobs')
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

start()
