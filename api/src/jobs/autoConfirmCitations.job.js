// Confirmación automática de citaciones: cada 10 minutos, las Pendientes con el plazo para responder vencido (24 horas
// desde la citación) pasan a Confirmada automáticamente (contexto, sección 6). Saltea los clubes bloqueados por integridad
const { autoConfirmExpired } = require('../modules/citations/citations.service')
const { getUnlockedClubIds } = require('../modules/integrity/integrity.service')

module.exports = {
    name: 'autoConfirmCitations',
    schedule: '*/10 * * * *',
    run: async () => autoConfirmExpired({ clubIds: await getUnlockedClubIds('autoConfirmCitations') })
}
