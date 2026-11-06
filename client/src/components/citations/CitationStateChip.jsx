import Chip from '@mui/material/Chip'

import StatusChip from '../common/StatusChip.jsx'
import { CITATION_STATES } from '../../utils/constants.js'
import { formatDeadline } from '../../utils/format.js'

// Estado de una citación: Confirmada y Confirmada automáticamente ok, Pendiente pending (con la fecha límite si se pide),
// Rechazada overdue y Cancelada neutro
const CITATION_STATE_CHIPS = {
  [CITATION_STATES.PENDING]: { status: 'pending', label: 'Pendiente' },
  [CITATION_STATES.CONFIRMED]: { status: 'ok', label: 'Confirmada' },
  [CITATION_STATES.AUTO_CONFIRMED]: { status: 'ok', label: 'Confirmada (automática)' },
  [CITATION_STATES.REJECTED]: { status: 'overdue', label: 'Rechazada' },
  [CITATION_STATES.CANCELLED]: { status: null, label: 'Cancelada' }
}

export default function CitationStateChip({ citation, withDeadline = false, ...props }) {
  const chip = CITATION_STATE_CHIPS[citation.citationState]
  if (!chip) return null

  if (!chip.status) return <Chip label={chip.label} size="small" sx={{ fontWeight: 600 }} {...props} />

  const label = withDeadline && citation.citationState === CITATION_STATES.PENDING
    ? `Pendiente · responde hasta ${formatDeadline(citation.dateMaxResponse)}`
    : chip.label

  return <StatusChip status={chip.status} label={label} {...props} />
}
