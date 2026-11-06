// Service de fees: cuotas sociales y deportivas, y pagos simulados.
// Lógica de negocio y acceso a modelos. Filtra siempre por el clubId del usuario logueado (nunca el del body),
// registra las acciones relevantes en la bitácora (utils/logger) y lanza los errores con createError (utils/errors).
const { Op } = require('sequelize')

const { Fee } = require('../../models')
const { today, daysBetween } = require('../../utils/dates')
const { FEE_STATES } = require('../../utils/constants')

// ---------- Mora ----------

// Días de atraso de un socio: los días entre hoy y el vencimiento de su cuota no Pagada más vieja que ya venció.
// 0 si no tiene cuotas vencidas. La mora no es un estado: se calcula desde expirationDate (contexto, sección 6).
// La usan las citaciones (P12) y la va a usar el resto del módulo de cuotas (P14)
async function getOverdueDays(memberId, { transaction } = {}) {
    const now = today()

    const oldest = await Fee.findOne({
        where: { memberId, feeState: { [Op.ne]: FEE_STATES.PAID }, expirationDate: { [Op.lt]: now } },
        attributes: ['expirationDate'],
        order: [['expirationDate', 'ASC']],
        transaction
    })

    return oldest ? daysBetween(oldest.expirationDate, now) : 0
}

module.exports = {
    getOverdueDays
}
