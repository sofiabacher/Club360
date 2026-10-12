// Dígitos verificadores automáticos: mantienen el DVH de cada registro y el DVV de cada tabla en cada escritura.
// Para que funcionen, toda escritura tiene que pasar por Sequelize y, si hay una transacción, ir en options.transaction.
//
// Límites conocidos (los corrige la reparación del módulo integrity):
//   - Un borrado que pone una FK en NULL en otra tabla (SET NULL) no recalcula el DVH de esas filas.
//   - Dos transacciones simultáneas sobre la misma tabla pueden dejar el DVV calculado sin las filas de la otra.
const { computeRowDVH, computeTableDVV } = require('../utils/integrity')

// Sin transacción, las escrituras de una misma tabla se procesan de a una, para que el DVV no se pise entre ellas
const queues = new Map()

function runInOrder(Model, transaction, task) {
    if (transaction) return task()

    const next = (queues.get(Model) || Promise.resolve()).then(task, task)
    queues.set(Model, next.catch(() => {}))
    return next
}

function registerIntegrityHooks(models) {
    const { Dvv } = models

    async function updateTableDVV(Model, transaction) {
        const dvv = await computeTableDVV(Model, transaction)
        await Dvv.upsert({ tableName: Model.getTableName(), dvv }, { transaction })
    }

    // Relee la fila desde la base y guarda su DVH: así se calcula sobre los mismos valores que va a leer la verificación
    // (los DECIMAL vuelven como "1500.00", los booleanos como 1/0)
    async function updateRowDVH(Model, where, transaction) {
        const row = await Model.findOne({ where, raw: true, transaction })
        if (!row) return null

        const dvh = computeRowDVH(Model, row)

        if (row.dvh !== dvh) {   // hooks: false evita que este update dispare el hook de nuevo
            await Model.update({ dvh }, { where, hooks: false, silent: true, transaction })
        }

        return dvh
    }

    const afterWrite = (Model) => (instance, options) => runInOrder(Model, options.transaction, async () => {
        const where = {}
        for (const name of Model.primaryKeyAttributes) where[name] = instance.get(name)

        const dvh = await updateRowDVH(Model, where, options.transaction)

        if (dvh !== null) {   // La instancia en memoria queda igual que la base
            instance.setDataValue('dvh', dvh)
            instance.changed('dvh', false)
        }

        await updateTableDVV(Model, options.transaction)
    })

    // upsert no devuelve siempre la clave primaria: si falta, se revisan todas las filas de la tabla
    const afterUpsert = (Model) => ([instance], options) => runInOrder(Model, options.transaction, async () => {
        const keys = Model.primaryKeyAttributes
        const hasKey = keys.every(name => instance.get(name) !== undefined && instance.get(name) !== null)
        const rows = hasKey ? [instance.get()] : await Model.findAll({ attributes: keys, raw: true, transaction: options.transaction })

        for (const row of rows) {
            const where = {}
            for (const name of keys) where[name] = row[name]
            await updateRowDVH(Model, where, options.transaction)
        }

        await updateTableDVV(Model, options.transaction)
    })

    const afterDestroy = (Model) => (instance, options) => runInOrder(Model, options.transaction, async () => {
        await updateTableDVV(Model, options.transaction)

        // El borrado en cascada lo hace la base, sin pasar por los hooks de la tabla intermedia
        for (const association of Object.values(Model.associations)) {
            const cascades = association.associationType === 'HasMany' && association.options.onDelete === 'CASCADE'
            if (cascades && association.target.rawAttributes.dvh) {
                await updateTableDVV(association.target, options.transaction)
            }
        }
    })

    const withIndividualHooks = (...args) => {   // Las operaciones masivas también disparan los hooks de cada registro
        args[args.length - 1].individualHooks = true
    }

    for (const Model of Object.values(models)) {
        if (!Model.rawAttributes.dvh) continue   // Log y Dvv no llevan dvh

        // afterCreate + afterUpdate en lugar de afterSave: Model.update() con individualHooks dispara afterUpdate, no afterSave
        Model.addHook('afterCreate', 'integrity', afterWrite(Model))
        Model.addHook('afterUpdate', 'integrity', afterWrite(Model))
        Model.addHook('afterUpsert', 'integrity', afterUpsert(Model))
        Model.addHook('afterDestroy', 'integrity', afterDestroy(Model))

        Model.addHook('beforeBulkCreate', 'integrity', withIndividualHooks)
        Model.addHook('beforeBulkUpdate', 'integrity', withIndividualHooks)
        Model.addHook('beforeBulkDestroy', 'integrity', withIndividualHooks)
    }
}

module.exports = { registerIntegrityHooks }
