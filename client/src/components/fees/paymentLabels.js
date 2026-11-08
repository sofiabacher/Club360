// Cómo se muestran los pagos: el estado (con StatusChip) y el medio de pago
import { PAYMENT_METHODS, TRANSACTION_STATES } from '../../utils/constants.js'

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
