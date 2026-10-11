// Carga inicial de un club. Se corre a mano con `npm run seed`, nunca al arrancar el servidor.
//
// Pasos previstos (todos dentro de la transacción):
//   1. Catálogo de deportes (sport)
//   2. Club Valencia (club)
//   3. Activación de Vóley para el club (clubSport)
//   4. Permisos (permission) + los 7 roles base (role, isBase = 1) con sus permisos (role_permission)
//   5. Usuario Admin del club (user + user_role)
//   6. Recálculo de DVH de cada registro y DVV de cada tabla
//
// Los datos van en SEED_DATA: para cargar otro club solo se cambian esos datos.
const sequelize = require('../config/db')

require('../models')

const SEED_DATA = {
    // sports: [],
    // club: {},
    // clubSports: [],
    // permissions: [],
    // roles: [],
    // admin: {}
}

async function seed() {
    try {
        await sequelize.authenticate()
        await sequelize.sync()

        await sequelize.transaction(async (transaction) => {
            // Los inserts se completan en la tarea del seed (Fase 1 de docs/TODO.md)
        })

        console.log('Seed finalizado')
        await sequelize.close()
        process.exit(0)

    } catch (error) {
        console.error('Error en el seed:', error.message)
        process.exit(1)
    }
}

seed()
