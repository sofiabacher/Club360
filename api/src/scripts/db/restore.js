// Restore de un snapshot (herramienta de DESARROLLO): vuelve a cargar los datos guardados con `npm run db:snapshot` en
// una base recién recreada con DB_FORCE_SYNC, para aplicar un cambio en el modelo sin perder los datos cargados.
//
// Es la ÚNICA excepción a la regla de escribir datos solo por Sequelize (modelos y hooks): inserta con
// queryInterface.bulkInsert para restaurar exactamente lo que había, con sus ids, sus fechas, el teléfono ya cifrado y
// los dígitos verificadores ya calculados (con Model.bulkCreate se volvería a cifrar el teléfono y correrían los hooks).
// Al terminar recalcula el DVV de cada tabla y verifica los DVH.
//
// En producción no se usa: las copias de seguridad de la demo son del módulo backup.
//
// Uso: npm run db:restore                         (el snapshot más reciente de api/backups/)
//      npm run db:restore -- <archivo>            (un snapshot en particular)
//      npm run db:restore -- --recompute-dvh      (además recalcula los DVH, si cambió el tipo de alguna columna)
const fs = require('fs')
const path = require('path')
const { DataTypes } = require('sequelize')

const sequelize = require('../../config/db')
const models = require('../../models')
const { computeRowDVH, computeTableDVV } = require('../../utils/integrity')

const BACKUPS_DIR = path.join(__dirname, '../../../backups')
const CHUNK_SIZE = 500

const args = process.argv.slice(2)
const recomputeDvh = args.includes('--recompute-dvh')
const fileArg = args.find(arg => !arg.startsWith('--'))

const { Dvv } = models
const allModels = Object.values(models)
const integrityModels = allModels.filter(Model => Model.rawAttributes.dvh)

// El snapshot pedido o el más reciente de api/backups/
function findSnapshot() {
    if (fileArg) {
        const file = path.resolve(fileArg)
        if (!fs.existsSync(file)) throw new Error(`No existe el archivo ${fileArg}`)
        return file
    }

    const files = fs.existsSync(BACKUPS_DIR)
        ? fs.readdirSync(BACKUPS_DIR).filter(name => /^snapshot-\d{8}-\d{6}\.json$/.test(name)).sort()
        : []

    if (files.length === 0) throw new Error('No hay snapshots en api/backups/. Corré primero npm run db:snapshot.')
    return path.join(BACKUPS_DIR, files[files.length - 1])
}

// Lleva un valor del JSON a lo que espera la columna: las fechas (DATETIME) vuelven a ser Date, así Sequelize las
// escribe con la zona horaria de la conexión; los objetos (columnas JSON, ej. club.extraInfo) van como texto
function toColumnValue(attribute, value) {
    if (value === null || value === undefined) return null
    if (attribute.type instanceof DataTypes.DATE && !(attribute.type instanceof DataTypes.DATEONLY)) return new Date(value)
    if (typeof value === 'object') return JSON.stringify(value)
    return value
}

// Columnas del modelo por nombre de columna en la base
const columnsOf = (Model) => new Map(Object.values(Model.rawAttributes).map(attribute => [attribute.field, attribute]))

async function assertEmptyDatabase() {
    const notEmpty = []
    for (const Model of allModels) {
        const count = await Model.count()
        if (count > 0) notEmpty.push(`${Model.getTableName()} (${count})`)
    }

    if (notEmpty.length > 0) {
        throw new Error(`La base no está vacía: recreala con DB_FORCE_SYNC antes de restaurar. No corras el seed antes.\n  Tablas con datos: ${notEmpty.join(', ')}`)
    }
}

// Inserta las filas de cada tabla del snapshot. Devuelve los avisos (tablas o columnas que ya no existen en el modelo)
async function insertTables(tables, transaction) {
    const queryInterface = sequelize.getQueryInterface()
    const modelsByTable = new Map(allModels.map(Model => [Model.getTableName(), Model]))
    const warnings = []
    const inserted = {}

    for (const [tableName, { rows }] of Object.entries(tables)) {
        const Model = modelsByTable.get(tableName)
        if (!Model) {
            warnings.push(`La tabla ${tableName} ya no existe en los modelos: se ignoraron sus ${rows.length} filas`)
            continue
        }

        const columns = columnsOf(Model)
        const dropped = new Set(rows.flatMap(row => Object.keys(row)).filter(name => !columns.has(name)))
        if (dropped.size > 0) warnings.push(`${tableName}: se ignoraron las columnas que ya no están en el modelo: ${[...dropped].join(', ')}`)

        const records = rows.map(row => Object.fromEntries(
            Object.entries(row)
                .filter(([name]) => columns.has(name))
                .map(([name, value]) => [name, toColumnValue(columns.get(name), value)])
        ))

        for (let start = 0; start < records.length; start += CHUNK_SIZE) {
            await queryInterface.bulkInsert(tableName, records.slice(start, start + CHUNK_SIZE), { transaction })
        }

        inserted[tableName] = records.length
    }

    return { warnings, inserted }
}

// Recalcula el DVH de cada fila (solo con --recompute-dvh)
async function recomputeAllDvh(transaction) {
    for (const Model of integrityModels) {
        const rows = await Model.findAll({ raw: true, transaction })
        for (const row of rows) {
            const where = Object.fromEntries(Model.primaryKeyAttributes.map(name => [name, row[name]]))
            await Model.update({ dvh: computeRowDVH(Model, row) }, { where, hooks: false, silent: true, transaction })
        }
    }
}

// Recalcula el DVV de las tablas que tienen filas o que ya tenían DVV en el snapshot (las tablas que nunca se usaron
// siguen sin fila en dvv, como antes)
async function recomputeAllDvv(transaction) {
    for (const Model of integrityModels) {
        const tableName = Model.getTableName()
        const hasRows = await Model.count({ transaction }) > 0
        const hadDvv = Boolean(await Dvv.findByPk(tableName, { transaction }))
        if (!hasRows && !hadDvv) continue

        await Dvv.upsert({ tableName, dvv: await computeTableDVV(Model, transaction) }, { transaction })
    }
}

// Filas cuyo DVH no coincide, por tabla
async function verifyDvh() {
    const problems = {}
    for (const Model of integrityModels) {
        const rows = await Model.findAll({ raw: true })
        const bad = rows.filter(row => row.dvh !== computeRowDVH(Model, row)).length
        if (bad > 0) problems[Model.getTableName()] = bad
    }
    return problems
}

async function restore() {
    await sequelize.authenticate()

    const file = findSnapshot()
    const snapshot = JSON.parse(fs.readFileSync(file, 'utf8'))
    console.log(`\nRestaurando ${path.relative(process.cwd(), file)} (del ${snapshot.createdAt})`)

    await assertEmptyDatabase()

    // Una sola transacción, con las FK desactivadas en la misma conexión: así no importa el orden de las tablas
    const { warnings, inserted } = await sequelize.transaction(async (transaction) => {
        await sequelize.query('SET FOREIGN_KEY_CHECKS = 0', { transaction })
        const result = await insertTables(snapshot.tables, transaction)
        if (recomputeDvh) await recomputeAllDvh(transaction)
        await recomputeAllDvv(transaction)
        await sequelize.query('SET FOREIGN_KEY_CHECKS = 1', { transaction })
        return result
    })

    console.log('\nFilas restauradas')
    for (const [tableName, count] of Object.entries(inserted)) {
        console.log(`  ${tableName.padEnd(16)} ${String(count).padStart(6)}`)
    }

    warnings.forEach(warning => console.log(`\nAviso: ${warning}`))

    const problems = await verifyDvh()
    if (Object.keys(problems).length === 0) {
        console.log(`\nIntegridad: DVH correctos en todas las tablas${recomputeDvh ? ' (recalculados)' : ''} y DVV recalculados.`)
    } else {
        console.log('\nIntegridad: hay DVH que no coinciden (por ejemplo, porque cambió el tipo de una columna):')
        for (const [tableName, count] of Object.entries(problems)) console.log(`  ${tableName}: ${count} filas`)
        console.log('Si el cambio es esperado, volvé a recrear la base y corré: npm run db:restore -- --recompute-dvh')
        process.exitCode = 1
    }
}

restore()
    .then(() => sequelize.close())
    .catch(async (error) => {
        console.error(`\nNo se pudo restaurar: ${error.message}`)
        await sequelize.close()
        process.exit(1)
    })
