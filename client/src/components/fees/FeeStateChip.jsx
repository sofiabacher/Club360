import StatusChip from '../common/StatusChip.jsx'
import { FEE_STATES } from '../../utils/constants.js'

const CHIPS = {
  [FEE_STATES.PAID]: { status: 'ok', label: 'Pagada' },
  [FEE_STATES.PENDING]: { status: 'pending', label: 'Pendiente' },
  [FEE_STATES.OVERDUE]: { status: 'overdue', label: 'Vencida' }
}

// Estado de una cuota: Pagada, Pendiente o Vencida
export default function FeeStateChip({ feeState }) {
  const chip = CHIPS[feeState] ?? CHIPS[FEE_STATES.PENDING]
  return <StatusChip status={chip.status} label={chip.label} />
}
