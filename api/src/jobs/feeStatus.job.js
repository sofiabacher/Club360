// Chequeo diario de cuotas (todos los días a las 00:15): avisos de cuota por vencer, paso a Vencida con su aviso,
// recordatorios de mora cada 30 días de atraso y suspensión de los socios que superan el plazo del club.
// Saltea los clubes bloqueados por integridad
const { runDailyFeeCheck } = require('../modules/fees/fees.service')
const { getUnlockedClubIds } = require('../modules/integrity/integrity.service')

module.exports = {
    name: 'feeStatus',
    schedule: '15 0 * * *',
    run: async () => runDailyFeeCheck(undefined, { clubIds: await getUnlockedClubIds('feeStatus') })
}
