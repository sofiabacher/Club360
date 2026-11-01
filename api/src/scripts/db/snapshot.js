// Snapshot de la base (herramienta de desarrollo): guarda todas las filas de todas las tablas de los modelos en
// api/backups/snapshot-AAAAMMDD-HHmmss.json, para recrear la base (DB_FORCE_SYNC) sin perder los datos y volver a
// cargarlos con `npm run db:restore`.
//
// Las filas se leen sin pasar por los modelos (SELECT * con QueryTypes.SELECT, igual que raw: true), tal cual están en la
// base: el teléfono cifrado, los hashes de las contraseñas, los dvh y las fechas. Se leen las columnas que tiene la base
// y no las del modelo, así el snapshot funciona aunque el modelo ya tenga una columna nueva que la base todavía no.
// Uso: npm run db:snapshot
const fs = require('fs')
const path = require('path')
const { QueryTypes } = require('sequelize')

const sequelize = require('../../config/db')
const models = require('../../models')

const BACKUPS_DIR = path.join(__dirname, '../../../backups')

// AAAAMMDD-HHmmss con la hora de la máquina
function timestamp(date = new Date()) {
    const pad = (value) => String(value).padStart(2, '0')
    return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
}

async function snapshot() {
    await sequelize.authenticate()

    const tables = {}
    for (const Model of Object.values(models)) {
        const order = Model.primaryKeyAttributes.map(name => `\`${Model.rawAttributes[name].field}\``).join(', ')
        const rows = await sequelize.query(`SELECT * FROM \`${Model.getTableName()}\` ORDER BY ${order}`, { type: QueryTypes.SELECT })
        tables[Model.getTableName()] = { model: Model.name, count: rows.length, rows }
    }

    fs.mkdirSync(BACKUPS_DIR, { recursive: true })
    const file = path.join(BACKUPS_DIR, `snapshot-${timestamp()}.json`)
    fs.writeFileSync(file, JSON.stringify({ createdAt: new Date().toISOString(), database: sequelize.getDatabaseName(), tables }, null, 1))

    console.log('\nSnapshot de la base')
    for (const [tableName, { count }] of Object.entries(tables)) {
        console.log(`  ${tableName.padEnd(16)} ${String(count).padStart(6)} filas`)
    }

    const total = Object.values(tables).reduce((sum, table) => sum + table.count, 0)
    console.log(`\n${total} filas en ${Object.keys(tables).length} tablas`)
    console.log(`Guardado en ${path.relative(process.cwd(), file)}`)
}

snapshot()
    .then(() => sequelize.close())
    .catch(async (error) => {
        console.error('No se pudo hacer el snapshot:', error.message)
        await sequelize.close()
        process.exit(1)
    })
