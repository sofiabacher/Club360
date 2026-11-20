import StatusChip from '../common/StatusChip.jsx'
import { CHARGE_STATES } from '../../utils/constants.js'

const CHIPS = {
  [CHARGE_STATES.PAID]: { status: 'ok', label: 'Pagado' },
  [CHARGE_STATES.PENDING]: { status: 'pending', label: 'Pendiente' },
  [CHARGE_STATES.OVERDUE]: { status: 'overdue', label: 'Vencido' },
  [CHARGE_STATES.CANCELLED]: { status: 'neutral', label: 'Anulado' }
}

// Estado del cargo eventual de un socio: Pagado, Pendiente, Vencido o Anulado
export default function ChargeStateChip({ chargeState }) {
  const chip = CHIPS[chargeState] ?? CHIPS[CHARGE_STATES.PENDING]
  return <StatusChip status={chip.status} label={chip.label} />
}
