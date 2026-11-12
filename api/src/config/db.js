const { Sequelize } = require('sequelize')
const { db } = require('./index')

const options = {
    dialect: 'mysql',
    logging: false,
    timezone: '-03:00',
    define: { freezeTableName: true },   // Los nombres de tabla son los del DER, sin pluralizar
    // Pool chico: la base de Railway se comparte entre el back de Render y los scripts que se corren desde una compu
    pool: { max: 5, min: 0, acquire: 30000, idle: 10000 }
}

// Con DATABASE_URL (demo en la nube, la conexión pública de Railway) se conecta por SSL, salvo DB_SSL=false.
// Si no, usa el MySQL local.
const sequelize = db.url
    ? new Sequelize(db.url, {
        ...options,
        ...(db.ssl && { dialectOptions: { ssl: { require: true, rejectUnauthorized: false } } })
    })
    : new Sequelize({
        ...options,
        database: db.name,
        username: db.user,
        password: db.password,
        host: db.host,
        port: db.port
    })

module.exports = sequelize
