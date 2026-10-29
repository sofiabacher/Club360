import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'

import StatusChip from '../common/StatusChip.jsx'
import { MEMBER_STATES } from '../../utils/constants.js'

// Estado de una jugadora en una categoría: Suspendida por mora (urgent), "Socia inactiva" (neutro) y "Supera la edad"
// (overdue). suspendedLabel permite otro texto para la suspensión (en Mis categorías se muestra "Mora").
export default function PlayerStatusChips({ memberStateId, exceedsAge, suspendedLabel = 'Suspendida' }) {
  return (
    <Stack direction="row" sx={{ gap: 0.5, flexWrap: 'wrap', alignItems: 'center' }}>
      {memberStateId === MEMBER_STATES.SUSPENDED && <StatusChip status="urgent" label={suspendedLabel} />}
      {memberStateId === MEMBER_STATES.INACTIVE && <Chip label="Socia inactiva" size="small" sx={{ fontWeight: 600 }} />}
      {exceedsAge && <StatusChip status="overdue" label="Supera la edad" />}
    </Stack>
  )
}
