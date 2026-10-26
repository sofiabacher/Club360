import Chip from '@mui/material/Chip'

import StatusChip from '../common/StatusChip.jsx'
import { USER_STATES } from '../../utils/constants.js'

// Estado de una persona del staff: Activo ok, Pendiente de activación pending, Bloqueado overdue.
// Ex staff (sin roles de staff) va con un chip neutro
export default function StaffStatusChip({ isActiveStaff, userStateId }) {
  if (!isActiveStaff) return <Chip label="Ex staff" size="small" sx={{ fontWeight: 600 }} />
  if (userStateId === USER_STATES.PENDING) return <StatusChip status="pending" label="Pendiente de activación" />
  if (userStateId === USER_STATES.BLOCKED) return <StatusChip status="overdue" label="Bloqueado" />
  return <StatusChip status="ok" label="Activo" />
}
