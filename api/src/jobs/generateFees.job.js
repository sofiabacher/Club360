// Generación de la cuota mensual (D12): el día 1 de cada mes a las 00:05 se generan las cuotas del mes, que vencen el 10.
// Es idempotente: si corre dos veces, no duplica nada. Saltea los clubes bloqueados por integridad
const { generateMonthlyFees } = require('../modules/fees/fees.service')
const { getUnlockedClubIds } = require('../modules/integrity/integrity.service')
const { FEE_GENERATION_DAY } = require('../utils/constants')

module.exports = {
    name: 'generateFees',
    schedule: `5 0 ${FEE_GENERATION_DAY} * *`,
    run: async () => generateMonthlyFees(undefined, { clubIds: await getUnlockedClubIds('generateFees') })
}
