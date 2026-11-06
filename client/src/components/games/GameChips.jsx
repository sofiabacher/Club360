import Chip from '@mui/material/Chip'

import StatusChip from '../common/StatusChip.jsx'
import { GAME_STATES } from '../../utils/constants.js'

// Estado del partido: Programado pending, Jugado ok, Cancelado overdue
const GAME_STATE_CHIPS = {
  [GAME_STATES.SCHEDULED]: { status: 'pending', label: 'Programado' },
  [GAME_STATES.PLAYED]: { status: 'ok', label: 'Jugado' },
  [GAME_STATES.CANCELLED]: { status: 'overdue', label: 'Cancelado' }
}

export function GameStateChip({ gameState }) {
  const chip = GAME_STATE_CHIPS[gameState]
  return chip ? <StatusChip status={chip.status} label={chip.label} /> : null
}

// Local o Visitante
export function HomeChip({ isHome }) {
  return <Chip label={isHome ? 'Local' : 'Visitante'} size="small" variant="outlined" color={isHome ? 'secondary' : 'default'} sx={{ fontWeight: 600 }} />
}
