// Cómo se muestran los pagos: el estado (con StatusChip), el medio de pago y qué se pagó (una cuota o un cargo eventual)
import { PAYMENT_METHODS, TRANSACTION_STATES } from '../../utils/constants.js'
import { formatPeriod } from '../../utils/format.js'

// Nombre de una cuota ("Noviembre 2026") o de un cargo eventual (su concepto)
export const itemLabel = (item) => (item.kind === 'charge' ? item.concept : formatPeriod(item.period))

// Qué pagó un pago: "Cuota de Noviembre 2026" o el concepto del cargo
export const paymentLabel = (payment) => (payment.kind === 'charge' ? payment.concept : `Cuota de ${formatPeriod(payment.period)}`)

export const PAYMENT_CHIPS = {
  [TRANSACTION_STATES.APPROVED]: { status: 'ok', label: 'Aprobado' },
  [TRANSACTION_STATES.PENDING]: { status: 'pending', label: 'Pendiente' },
  [TRANSACTION_STATES.REJECTED]: { status: 'overdue', label: 'Rechazado' }
}

export const PAYMENT_METHOD_LABELS = {
  [PAYMENT_METHODS.CARD]: 'Tarjeta',
  [PAYMENT_METHODS.TRANSFER]: 'Transferencia',
  [PAYMENT_METHODS.CASH]: 'Secretaría'
}
