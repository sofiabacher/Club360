// Confirmación automática de citaciones: cada 10 minutos, las Pendientes con el plazo para responder vencido (24 horas
// desde la citación) pasan a Confirmada automáticamente (contexto, sección 6)
const { autoConfirmExpired } = require('../modules/citations/citations.service')

module.exports = {
    name: 'autoConfirmCitations',
    schedule: '*/10 * * * *',
    run: autoConfirmExpired
}
