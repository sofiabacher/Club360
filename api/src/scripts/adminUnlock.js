// Rescate de acceso del Admin del Club (herramienta del EQUIPO, se corre desde una compu): desbloquea a un Admin y le
// pone una contraseña temporal. Existe porque Club360 no tiene un superadmin de la plataforma: si el único Admin de un
// club se bloquea y su email no sirve para "¿Olvidaste tu contraseña?", nadie lo puede desbloquear desde la aplicación.
// Quien tiene acceso a la base es, en los hechos, el dueño de la plataforma: por eso el rescate vive acá y no en la web.
//
// - Antes de conectarse muestra la base y, si no es local, pide escribir su nombre (utils/dbTarget.js, igual que db:restore).
// - Solo sirve para usuarios que tienen access.assignRoles con alguno de sus roles (calculado con getEffectivePermissions).
//   Socios, staff y los demás se desbloquean desde la aplicación.
// - Genera una contraseña temporal que cumple la política y la muestra UNA vez (no se escribe por consola para que no
//   quede en el historial). El Admin la cambia desde Mi cuenta al entrar.
// - Escribe con el modelo User (los hooks calculan el DVH y el DVV) y lo registra en la bitácora (ADMIN_RESCUE).
//   Cambiar la contraseña invalida los links de recuperación que estaban pendientes.
//
// Uso: npm run admin:unlock                  (pregunta el usuario)
//      npm run admin:unlock -- <usuario>
const crypto = require('crypto')
const readline = require('readline')

const sequelize = require('../config/db')
const { User, UserRole } = require('../models')
const logger = require('../utils/logger')
const { hashPassword } = require('../utils/crypto')
const { confirmTarget } = require('../utils/dbTarget')
const { USER_STATES, LOG_ACTIONS } = require('../utils/constants')
const { PERMISSIONS } = require('../utils/permissions')
const { getEffectivePermissions } = require('../modules/access/access.service')
const { isValidPassword } = require('../modules/auth/auth.validator')

const CONFIRM_WORD = 'RESCATAR'

class RescueError extends Error {}

function ask(question) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
    return new Promise(resolve => {
        rl.on('close', () => resolve(''))   // Sin consola (stdin cerrado) cuenta como respuesta vacía
        rl.question(question, answer => {
            rl.removeAllListeners('close')
            rl.close()
            resolve(answer.trim())
        })
    })
}

// Contraseña temporal: 3 bloques al azar sin caracteres que se confundan, con mayúscula, minúscula, número y símbolo
// garantizados (cumple la política de contraseñas)
function temporaryPassword() {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
    const block = () => Array.from(crypto.randomBytes(4), byte => alphabet[byte % alphabet.length]).join('')

    for (;;) {
        const password = `Tmp-${block()}-${block()}-${crypto.randomInt(10, 100)}!`
        if (isValidPassword(password)) return password
    }
}

// true si alguno de sus roles le da access.assignRoles (la única fuente de permisos es getEffectivePermissions)
async function isClubAdmin(user) {
    const roles = await UserRole.findAll({ where: { userId: user.id }, attributes: ['roleId'], raw: true })
    for (const { roleId } of roles) {
        if ((await getEffectivePermissions(user.id, roleId)).includes(PERMISSIONS.ACCESS_ASSIGN_ROLES)) return true
    }
    return false
}

const STATE_LABELS = {
    [USER_STATES.ACTIVE]: 'Activo',
    [USER_STATES.BLOCKED]: 'Bloqueado',
    [USER_STATES.PENDING]: 'Pendiente',
    [USER_STATES.DELETED]: 'Eliminado'
}

async function run() {
    // 1. Base (si no es local, se confirma escribiendo su nombre) y usuario
    await confirmTarget(sequelize, 'desbloquear a un Admin y cambiarle la contraseña')
    await sequelize.authenticate()

    const username = process.argv.slice(2).find(arg => !arg.startsWith('--')) ?? await ask('Usuario del Admin: ')
    if (!username) throw new RescueError('Cancelado: no se indicó el usuario.')

    // 2. Tiene que existir, estar Activo o Bloqueado y ser Admin del club
    const user = await User.findOne({ where: { username } })
    if (!user) throw new RescueError(`No existe el usuario "${username}".`)
    if (![USER_STATES.ACTIVE, USER_STATES.BLOCKED].includes(user.userStateId)) {
        throw new RescueError(`El usuario está ${STATE_LABELS[user.userStateId] ?? user.userStateId}: el rescate es solo para usuarios Activos o Bloqueados.`)
    }
    if (!await isClubAdmin(user)) {
        throw new RescueError('El usuario no es Admin del Club. A los demás los desbloquea un Admin desde la aplicación.')
    }

    // 3. Confirmación
    console.log(`\nUsuario: ${user.username} (${user.name} ${user.lastName}), club ${user.clubId}, estado ${STATE_LABELS[user.userStateId]}`)
    console.log('Se lo va a desbloquear y se le va a poner una contraseña temporal. La contraseña actual deja de servir.')
    const answer = await ask(`Para confirmar, escribí ${CONFIRM_WORD}: `)
    if (answer !== CONFIRM_WORD) throw new RescueError('Cancelado: no se cambió nada.')

    // 4. Desbloqueo y contraseña temporal, con la bitácora en la misma transacción
    const password = temporaryPassword()
    const wasBlocked = user.userStateId === USER_STATES.BLOCKED

    await sequelize.transaction(async (transaction) => {
        await user.update({ password: await hashPassword(password), userStateId: USER_STATES.ACTIVE, failedAttempts: 0 }, { transaction })
        await logger({ clubId: user.clubId, userId: null, roleId: null }, LOG_ACTIONS.ADMIN_RESCUE,
            `Rescate desde una compu del equipo: usuario "${user.username}" (id ${user.id})${wasBlocked ? ' desbloqueado y' : ''} con contraseña temporal`,
            { transaction })
    })

    console.log(`\nListo. ${user.username} ya puede entrar con esta contraseña temporal (se muestra una sola vez):\n`)
    console.log(`    ${password}\n`)
    console.log('Pasásela por un canal privado y pedile que la cambie enseguida desde Mi cuenta.')
}

run()
    .then(async () => {
        await sequelize.close()
        process.exit(0)
    })
    .catch(async (error) => {
        console.error(error instanceof RescueError ? error.message : `Error en el rescate: ${error.message}`)
        await sequelize.close().catch(() => {})
        process.exit(1)
    })
