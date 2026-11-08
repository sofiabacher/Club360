// Tareas programadas (node-cron). Una por archivo, se registran en el array de abajo.
//
// Jobs:
//   generateFees.job.js           Genera la cuota mensual (social + deportiva) el día 1
//   feeStatus.job.js              Avisos de cuota por vencer, cuotas vencidas, recordatorios de mora y suspensiones
//   autoConfirmCitations.job.js   Confirma las citaciones sin respuesta pasadas las 24 hs
//   backup.job.js                 (previsto, opcional) Backup automático de la base
//
// Cada job exporta { name, schedule, run }:
//   name       nombre para los mensajes de consola
//   schedule   expresión de cron (ej. '0 3 1 * *')
//   run        función async con la tarea
const cron = require('node-cron')

const jobs = [
    require('./autoConfirmCitations.job'),
    require('./generateFees.job'),
    require('./feeStatus.job')
]

function start() {
    for (const job of jobs) {
        cron.schedule(job.schedule, async () => {
            try {
                await job.run()
            } catch (error) {
                console.error(`Error en el job ${job.name}:`, error.message)
            }
        }, { timezone: 'America/Argentina/Buenos_Aires' })
    }

    console.log(`Jobs iniciados: ${jobs.length}`)
}

module.exports = { start }
