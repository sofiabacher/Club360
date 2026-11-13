// Filas "de un club": cómo se leen, se borran y se insertan las filas de un club, tal cual están en la base.
// Lo usan integrity (verificación), backup (copias y restauración) y el --reset de los datos de la demo (seed/demo.js).
// Los scripts db:snapshot y db:restore copian la base completa con las mismas funciones de bajo nivel (readTableRows e
// insertTableRows).
//
// Lectura en crudo (SELECT * como raw: true): el teléfono queda cifrado, las contraseñas hasheadas y los dvh como están.
// Inserción con queryInterface.bulkInsert: con los ids originales y sin hooks (no se vuelve a cifrar el teléfono ni se
// recalculan los dvh). Es una excepción a la regla de escribir solo con los modelos: la usan db:restore y la
// restauración de un backup, que tienen que dejar los datos exactamente como estaban.
const { DataTypes, QueryTypes, Op } = require('sequelize')

const sequelize = require('../config/db')
const models = require('../models')

const CHUNK_SIZE = 500

const {
    Club, User, Role, UserRole, RolePermission, UserPermission, ClubSport, Member, Staff, Inscription, Fee, Payment,
    League, Category, CategoryPlayer, CategoryStaff, Game, Citation, Routine, Notification
} = models

// Tablas de un club, en orden de dependencia: cada una solo apunta a tablas que están antes en la lista (o a los
// catálogos compartidos). Se insertan en este orden y se borran en el inverso, sin desactivar FOREIGN_KEY_CHECKS.
// Ninguna tabla se referencia a sí misma. Cómo se filtran sus filas:
//   - by: 'id'      la fila del club;
//   - by: 'clubId'  las tablas de negocio con clubId;
//   - by: 'parent'  las intermedias, a través de su tabla padre (que sí tiene clubId).
//
// Quedan afuera (EXCLUDED_TABLES):
//   - sport y permission: son catálogos compartidos por todos los clubes, no son de ninguno;
//   - dvv: es de la tabla completa (de todos los clubes) y se recalcula después de escribir;
//   - log: la bitácora no se restaura, para que una restauración no borre el rastro de lo que pasó (por eso log no tiene
//     FK a club, user ni role: sus registros conservan los ids aunque esas filas se reemplacen).
const CLUB_TABLES = [
    { Model: Club, by: 'id' },
    { Model: User, by: 'clubId' },
    { Model: Role, by: 'clubId' },
    { Model: UserRole, by: 'parent', parent: User, key: 'userId' },
    { Model: RolePermission, by: 'parent', parent: Role, key: 'roleId' },
    { Model: UserPermission, by: 'parent', parent: User, key: 'userId' },
    { Model: ClubSport, by: 'clubId' },
    { Model: Member, by: 'clubId' },
    { Model: Staff, by: 'clubId' },
    { Model: Inscription, by: 'clubId' },
    { Model: Fee, by: 'clubId' },
    { Model: Payment, by: 'clubId' },
    { Model: League, by: 'clubId' },
    { Model: Category, by: 'clubId' },
    { Model: CategoryPlayer, by: 'parent', parent: Category, key: 'categoryId' },
    { Model: CategoryStaff, by: 'parent', parent: Category, key: 'categoryId' },
    { Model: Game, by: 'clubId' },
    { Model: Citation, by: 'clubId' },
    { Model: Routine, by: 'clubId' },
    { Model: Notification, by: 'clubId' }
]

const EXCLUDED_TABLES = ['sport', 'permission', 'dvv', 'log']

// Al arrancar: todo modelo tiene que estar en CLUB_TABLES o en EXCLUDED_TABLES. Si se suma uno (por ejemplo, con
// clubId) y nadie lo agrega acá, el servidor no arranca: así no queda afuera de los backups ni de la verificación
;(function assertAllModelsCovered() {
    const covered = new Set([...CLUB_TABLES.map(({ Model }) => Model.getTableName()), ...EXCLUDED_TABLES])
    const missing = Object.values(models).map(Model => Model.getTableName()).filter(name => !covered.has(name))
    if (missing.length > 0) {
        throw new Error(`utils/clubData.js: las tablas ${missing.join(', ')} no están en CLUB_TABLES ni en EXCLUDED_TABLES. `
            + 'Agregalas a CLUB_TABLES (en orden de dependencia) o explicá por qué quedan afuera.')
    }
})()

const quote = (name) => `\`${name}\``
const tableOf = (Model) => Model.getTableName()

// ORDER BY por la clave primaria, para leer siempre en el mismo orden
const orderOf = (Model) => Model.primaryKeyAttributes.map(name => quote(Model.rawAttributes[name].field)).join(', ')

// ---------- Bajo nivel (también para db:snapshot y db:restore) ----------

// Filas de una tabla tal cual están en la base (SELECT *: las columnas de la base, no las del modelo).
// where: condición SQL opcional, con replacements
async function readTableRows(Model, { where = null, replacements = {}, transaction } = {}) {
    const sql = `SELECT * FROM ${quote(tableOf(Model))}${where ? ` WHERE ${where}` : ''} ORDER BY ${orderOf(Model)}`
    return sequelize.query(sql, { type: QueryTypes.SELECT, replacements, transaction })
}

// Lleva un valor leído (o del JSON de un archivo) a lo que espera la columna: las fechas (DATETIME) vuelven a ser Date,
// así se escriben con la zona horaria de la conexión; los objetos (columnas JSON, ej. club.extraInfo) van como texto
function toColumnValue(attribute, value) {
    if (value === null || value === undefined) return null
    if (attribute.type instanceof DataTypes.DATE && !(attribute.type instanceof DataTypes.DATEONLY)) return new Date(value)
    if (typeof value === 'object' && !(value instanceof Date)) return JSON.stringify(value)
    return value
}

// Columnas del modelo por nombre de columna en la base
const columnsOf = (Model) => new Map(Object.values(Model.rawAttributes).map(attribute => [attribute.field, attribute]))

// Inserta filas con sus ids originales (bulkInsert, sin hooks). Las columnas que el modelo ya no tiene se ignoran.
// Devuelve { inserted, droppedColumns }
async function insertTableRows(Model, rows, { transaction } = {}) {
    const columns = columnsOf(Model)
    const droppedColumns = [...new Set(rows.flatMap(row => Object.keys(row)).filter(name => !columns.has(name)))]

    const records = rows.map(row => Object.fromEntries(
        Object.entries(row)
            .filter(([name]) => columns.has(name))
            .map(([name, value]) => [name, toColumnValue(columns.get(name), value)])
    ))

    const queryInterface = sequelize.getQueryInterface()
    for (let start = 0; start < records.length; start += CHUNK_SIZE) {
        await queryInterface.bulkInsert(tableOf(Model), records.slice(start, start + CHUNK_SIZE), { transaction })
    }

    return { inserted: records.length, droppedColumns }
}

// ---------- Filas de un club ----------

// Condición SQL de las filas de un club en una tabla de CLUB_TABLES
function clubWhere({ by, parent, key }) {
    if (by === 'id') return 'id = :clubId'
    if (by === 'clubId') return 'clubId = :clubId'
    return `${quote(key)} IN (SELECT id FROM ${quote(tableOf(parent))} WHERE clubId = :clubId)`
}

// { [tabla]: filas } de un club, en el orden de CLUB_TABLES
async function readClubRows(clubId, { transaction } = {}) {
    const data = {}
    for (const table of CLUB_TABLES) {
        data[tableOf(table.Model)] = await readTableRows(table.Model, { where: clubWhere(table), replacements: { clubId }, transaction })
    }
    return data
}

// Condición de Sequelize de las filas de un club (para borrar con el modelo)
function clubModelWhere({ by, parent, key }, clubId) {
    if (by === 'id') return { id: clubId }
    if (by === 'clubId') return { clubId }
    return { [key]: { [Op.in]: sequelize.literal(`(SELECT id FROM ${quote(tableOf(parent))} WHERE clubId = ${sequelize.escape(clubId)})`) } }
}

// Borra las filas de un club en el orden inverso de CLUB_TABLES (primero las que dependen de otras), con el modelo y
// sin hooks: el DVV de las tablas lo recalcula quien llama, una vez al final. Devuelve { [tabla]: filas borradas }.
// keep (opcional): { [tabla]: true | condición } con lo que no se borra: true conserva toda la tabla; una condición de
// Sequelize conserva las filas que la cumplen (lo usa el --reset de seed/demo.js, que conserva lo que carga el seed)
async function deleteClubRows(clubId, { transaction, keep = {} } = {}) {
    const deleted = {}
    for (const table of [...CLUB_TABLES].reverse()) {
        const tableName = tableOf(table.Model)
        const kept = keep[tableName]
        if (kept === true) {
            deleted[tableName] = 0
            continue
        }

        const where = kept ? { [Op.and]: [clubModelWhere(table, clubId), { [Op.not]: kept }] } : clubModelWhere(table, clubId)
        deleted[tableName] = await table.Model.destroy({ where, hooks: false, transaction })
    }
    return deleted
}

// Inserta las filas de un club ({ [tabla]: filas }, como las devuelve readClubRows o las trae un backup) en el orden de
// CLUB_TABLES, con los ids originales. Las tablas que no están en CLUB_TABLES se ignoran. Devuelve { [tabla]: filas }
async function insertClubRows(data, { transaction } = {}) {
    const inserted = {}
    for (const { Model } of CLUB_TABLES) {
        const rows = data[tableOf(Model)] ?? []
        inserted[tableOf(Model)] = (await insertTableRows(Model, rows, { transaction })).inserted
    }
    return inserted
}

module.exports = {
    CLUB_TABLES,
    EXCLUDED_TABLES,
    readTableRows,
    insertTableRows,
    readClubRows,
    deleteClubRows,
    insertClubRows
}
