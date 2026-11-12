// Tareas programadas (node-cron). Una por archivo, se registran en el array de abajo.
//
// Jobs:
//   generateFees.job.js           Genera la cuota mensual (social + deportiva) el día 1
//   feeStatus.job.js              Avisos de cuota por vencer, cuotas vencidas, recordatorios de mora y suspensiones
//   autoConfirmCitations.job.js   Confirma las citaciones sin respuesta pasadas las 24 hs
//   integrityCheck.job.js         Verifica la integridad de cada club (todos los días a las 02:30)
//   backup.job.js                 Backup automático de cada club (domingos a las 03:00)
//
// Los que escriben datos de un club (cuotas y citaciones) saltean los clubes bloqueados por integridad
// (getUnlockedClubIds); el backup automático corre igual
//
// Cada job exporta { name, schedule, run }:
//   name       nombre para los mensajes de consola
//   schedule   expresión de cron (ej. '0 3 1 * *')
//   run        función async con la tarea
const cron = require('node-cron')
const { TIME_ZONE } = require('../utils/dates')

const jobs = [
    require('./autoConfirmCitations.job'),
    require('./generateFees.job'),
    require('./feeStatus.job'),
    require('./integrityCheck.job'),
    require('./backup.job')
]

function start() {
    for (const job of jobs) {
        cron.schedule(job.schedule, async () => {
            try {
                await job.run()
            } catch (error) {
                console.error(`Error en el job ${job.name}:`, error.message)
            }
        }, { timezone: TIME_ZONE })   // Render corre en UTC: los horarios son siempre de Argentina
    }

    console.log(`Jobs iniciados: ${jobs.length}`)
}

module.exports = { start }
