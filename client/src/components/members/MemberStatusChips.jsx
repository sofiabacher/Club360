import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'

import StatusChip from '../common/StatusChip.jsx'
import { MEMBER_STATES, USER_STATES } from '../../utils/constants.js'

// Estado del socio: Activo ok, Suspendido urgent (por mora). Inactivo (baja) va con un chip neutro
const MEMBER_STATE_CHIPS = {
  [MEMBER_STATES.ACTIVE]: { status: 'ok', label: 'Activo' },
  [MEMBER_STATES.SUSPENDED]: { status: 'urgent', label: 'Suspendido' }
}

// Estado del usuario que importa en la gestión de socios
const USER_STATE_CHIPS = {
  [USER_STATES.PENDING]: { status: 'pending', label: 'Pendiente de registro' },
  [USER_STATES.BLOCKED]: { status: 'overdue', label: 'Bloqueado' }
}

export function MemberStateChip({ memberStateId }) {
  const chip = MEMBER_STATE_CHIPS[memberStateId]
  if (chip) return <StatusChip status={chip.status} label={chip.label} />
  if (memberStateId === MEMBER_STATES.INACTIVE) return <Chip label="Inactivo" size="small" sx={{ fontWeight: 600 }} />
  return null
}

export function UserStateChip({ userStateId }) {
  const chip = USER_STATE_CHIPS[userStateId]
  return chip ? <StatusChip status={chip.status} label={chip.label} /> : null
}

// Los chips de un socio juntos: estado del socio, registro o bloqueo y, si corresponde, "Menor"
export default function MemberStatusChips({ memberStateId, userStateId, isMinor }) {
  return (
    <Stack direction="row" sx={{ gap: 0.75, flexWrap: 'wrap', alignItems: 'center' }}>
      <MemberStateChip memberStateId={memberStateId} />
      <UserStateChip userStateId={userStateId} />
      {isMinor && <Chip label="Menor" size="small" variant="outlined" color="secondary" sx={{ fontWeight: 600 }} />}
    </Stack>
  )
}
