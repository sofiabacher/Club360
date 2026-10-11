const { Sequelize } = require('sequelize')
const { db } = require('./index')

const options = {
    dialect: 'mysql',
    logging: false,
    timezone: '-03:00',
    define: { freezeTableName: true }   // Los nombres de tabla son los del DER, sin pluralizar
}

// Con DATABASE_URL (demo en la nube) se conecta por SSL. Si no, usa el MySQL local.
const sequelize = db.url
    ? new Sequelize(db.url, {
        ...options,
        dialectOptions: { ssl: { require: true, rejectUnauthorized: false } }
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
