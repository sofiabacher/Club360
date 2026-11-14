// Base de datos a la que apunta la conexión (P19), para los scripts que la recrean o la llenan: db:snapshot, db:restore
// y el arranque con DB_FORCE_SYNC o DB_ALTER_SYNC.
//
// Antes de hacer nada muestran el host y el nombre de la base (sin usuario ni contraseña). Si el host no es local, piden
// confirmación escribiendo el nombre de la base, así nadie recrea la base de la demo (Railway) sin darse cuenta: desde
// una compu, NODE_ENV no es production y el bloqueo de server.js no alcanza. Todo esto pasa antes de conectarse.
const readline = require('readline')

const LOCAL_HOSTS = ['localhost', '127.0.0.1', '::1']

// { host, port, database, isLocal, label } a partir de la configuración de Sequelize (no se conecta)
function describeTarget(sequelize) {
    const { host, port } = sequelize.config
    const database = sequelize.getDatabaseName()

    return {
        host,
        port: port ?? 3306,
        database,
        isLocal: LOCAL_HOSTS.includes(String(host).toLowerCase()),
        label: `${host}:${port ?? 3306} / ${database}`
    }
}

function ask(question) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
    return new Promise(resolve => {
        rl.on('close', () => resolve(''))   // Sin consola (stdin cerrado) cuenta como no confirmado
        rl.question(question, answer => {
            rl.removeAllListeners('close')
            rl.close()
            resolve(answer.trim())
        })
    })
}

// Muestra la base y, si no es local, pide escribir su nombre. Si no coincide, lanza un error y no se hace nada.
// action: qué va a hacer el script ("guardar un snapshot", "recrear todas las tablas"...)
async function confirmTarget(sequelize, action) {
    const target = describeTarget(sequelize)
    console.log(`Base de datos: ${target.label}`)
    if (target.isLocal) return target

    console.log(`\nAtención: la base NO es local. Vas a ${action} en ${target.host}.`)
    const answer = await ask(`Para seguir, escribí el nombre de la base (${target.database}): `)
    if (answer !== target.database) throw new Error('Cancelado: no se confirmó el nombre de la base. No se hizo nada.')

    return target
}

module.exports = {
    describeTarget,
    confirmTarget
}
