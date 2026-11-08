// Generación de la cuota mensual (D12): el día 1 de cada mes a las 00:05 se generan las cuotas del mes, que vencen el 10.
// Es idempotente: si corre dos veces, no duplica nada
const { generateMonthlyFees } = require('../modules/fees/fees.service')

module.exports = {
    name: 'generateFees',
    schedule: '5 0 1 * *',
    run: () => generateMonthlyFees()
}
