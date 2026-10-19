// Carga inicial de un club. Se corre a mano con `npm run seed`, nunca al arrancar el servidor.
// Se puede correr más de una vez: lo que ya existe no se duplica ni se pisa.
//
// Los datos del club están en data/club.js, los roles base en data/baseRoles.js, el catálogo de permisos
// en utils/permissions.js y los datos del usuario Admin en el .env (SEED_ADMIN_*).
const sequelize = require('../config/db')
const { seed: seedConfig } = require('../config')
const { User, Role, Permission, UserRole, RolePermission, Club, Sport, ClubSport } = require('../models')

const { hashPassword } = require('../utils/crypto')
const { USER_STATES, BASE_ROLES } = require('../utils/constants')
const { PERMISSION_CATALOG } = require('../utils/permissions')
const { BASE_ROLES_SEED } = require('./data/baseRoles')
const { CLUB_SEED } = require('./data/club')

// Cuenta cuántos registros se crearon y cuántos ya existían
function counter() {
    return { created: 0, existing: 0 }
}

function count(result, created) {
    result[created ? 'created' : 'existing']++
}

async function loadPermissions(transaction, summary) {
    const permissionsByName = {}

    for (const { name, description } of PERMISSION_CATALOG) {
        const [module, action] = name.split('.')

        const [permission, created] = await Permission.findOrCreate({
            where: { name },
            defaults: { module, action, description },
            transaction
        })

        permissionsByName[name] = permission
        count(summary.permissions, created)
    }

    return permissionsByName
}

async function loadSports(transaction, summary) {
    const sportsByName = {}

    for (const name of CLUB_SEED.sports) {
        const [sport, created] = await Sport.findOrCreate({ where: { name }, transaction })

        sportsByName[name] = sport
        count(summary.sports, created)
    }

    return sportsByName
}

async function loadClub(transaction, summary) {
    const { name, ...defaults } = CLUB_SEED.club
    const [club, created] = await Club.findOrCreate({ where: { name }, defaults, transaction })

    count(summary.club, created)
    return club
}

async function loadClubSports(club, sportsByName, transaction, summary) {
    for (const { name, priceFee } of CLUB_SEED.activeSports) {
        const sport = sportsByName[name]
        if (!sport) throw new Error(`El deporte "${name}" de activeSports no está en el catálogo de deportes`)

        const [, created] = await ClubSport.findOrCreate({
            where: { clubId: club.id, sportId: sport.id },
            defaults: { priceFee },
            transaction
        })

        count(summary.clubSports, created)
    }
}

async function loadBaseRoles(club, permissionsByName, transaction, summary) {
    const rolesByName = {}

    for (const { name, description, permissions } of BASE_ROLES_SEED) {
        const [role, created] = await Role.findOrCreate({
            where: { clubId: club.id, name },
            defaults: { description, isBase: true },
            transaction
        })

        rolesByName[name] = role
        count(summary.roles, created)
        summary.rolePermissions[name] = counter()

        for (const permissionName of permissions) {
            const permission = permissionsByName[permissionName]
            if (!permission) throw new Error(`El permiso "${permissionName}" del rol "${name}" no está en el catálogo`)

            const [, linked] = await RolePermission.findOrCreate({
                where: { roleId: role.id, permissionId: permission.id },
                transaction
            })

            count(summary.rolePermissions[name], linked)
        }
    }

    return rolesByName
}

async function loadAdmin(club, rolesByName, transaction, summary) {
    const { name, lastName, email, username, password, birthDate } = seedConfig.admin

    const [admin, created] = await User.findOrCreate({
        where: { username },
        defaults: {
            clubId: club.id,
            name,
            lastName,
            email,
            password: await hashPassword(password),
            birthDate,
            userStateId: USER_STATES.ACTIVE
        },
        transaction
    })

    count(summary.admin, created)

    const [, linked] = await UserRole.findOrCreate({
        where: { userId: admin.id, roleId: rolesByName[BASE_ROLES.ADMIN].id },
        transaction
    })

    count(summary.adminRole, linked)
    return admin
}

function printSummary(summary, club, admin) {
    const line = ({ created, existing }) => `${created + existing} (${created} creados, ${existing} ya existían)`
    const state = ({ created }) => created ? 'creado' : 'ya existía'

    console.log('\nResumen del seed')
    console.log(`  Permisos:            ${line(summary.permissions)}`)
    console.log(`  Deportes:            ${line(summary.sports)}`)
    console.log(`  Club:                ${club.name} (${state(summary.club)})`)
    console.log(`  Deportes activados:  ${line(summary.clubSports)}`)
    console.log(`  Roles base:          ${line(summary.roles)}`)

    for (const [roleName, result] of Object.entries(summary.rolePermissions)) {
        console.log(`    ${roleName.padEnd(20)} ${line(result)}`)
    }

    console.log(`  Usuario Admin:       ${admin.username} (${state(summary.admin)})`)
    console.log(`  Rol del Admin:       ${BASE_ROLES.ADMIN} (${summary.adminRole.created ? 'asignado' : 'ya lo tenía'})`)
}

async function seed() {
    try {
        if (!seedConfig.admin.password) {
            throw new Error('Falta definir SEED_ADMIN_PASSWORD en el .env (la contraseña del usuario Admin)')
        }

        await sequelize.authenticate()
        await sequelize.sync()

        const summary = {
            permissions: counter(),
            sports: counter(),
            club: counter(),
            clubSports: counter(),
            roles: counter(),
            rolePermissions: {},
            admin: counter(),
            adminRole: counter()
        }

        // Todo en una transacción: si algo falla, no queda nada a medias.
        // Se pasa en todas las operaciones para que los hooks de integridad trabajen dentro de ella.
        const { club, admin } = await sequelize.transaction(async (transaction) => {
            const permissionsByName = await loadPermissions(transaction, summary)
            const sportsByName = await loadSports(transaction, summary)
            const club = await loadClub(transaction, summary)
            await loadClubSports(club, sportsByName, transaction, summary)
            const rolesByName = await loadBaseRoles(club, permissionsByName, transaction, summary)
            const admin = await loadAdmin(club, rolesByName, transaction, summary)

            return { club, admin }
        })

        printSummary(summary, club, admin)
        console.log('\nSeed finalizado')

        await sequelize.close()
        process.exit(0)

    } catch (error) {
        console.error('Error en el seed:', error.message)
        process.exit(1)
    }
}

seed()
