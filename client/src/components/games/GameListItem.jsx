import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import PlaceRounded from '@mui/icons-material/PlaceRounded'

import StatusChip from '../common/StatusChip.jsx'
import { GameStateChip, HomeChip } from './GameChips.jsx'
import { GAME_STATES } from '../../utils/constants.js'
import { formatTime } from '../../utils/format.js'

// Un partido en las listas del fixture y del staff: la hora en grande, la categoría y la liga, "vs. {rival}", local o
// visitante, la dirección, el estado y, si tiene, cuántas jugadoras tienen conflicto. action: el menú (opcional)
export default function GameListItem({ game, action }) {
  const cancelled = game.gameState === GAME_STATES.CANCELLED

  return (
    <Stack direction="row" sx={{ gap: { xs: 1.5, sm: 2.5 }, alignItems: 'flex-start', py: 1.5 }}>
      <Typography variant="numeric" sx={{ fontSize: '1.6rem', color: 'navy.main', minWidth: 64, lineHeight: 1.2 }}>
        {formatTime(game.dateTime)}
      </Typography>

      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {game.category?.name} · {game.league?.name}
        </Typography>
        <Typography sx={{ fontWeight: 600, color: 'navy.main', textDecoration: cancelled ? 'line-through' : 'none', overflowWrap: 'anywhere' }}>
          vs. {game.rival}
        </Typography>
        <Stack direction="row" sx={{ alignItems: 'center', gap: 0.5, color: 'text.secondary', mt: 0.25 }}>
          <PlaceRounded sx={{ fontSize: 16 }} />
          <Typography variant="body2" sx={{ overflowWrap: 'anywhere' }}>{game.address}</Typography>
        </Stack>
        <Stack direction="row" sx={{ gap: 0.75, flexWrap: 'wrap', mt: 1 }}>
          <HomeChip isHome={game.isHome} />
          <GameStateChip gameState={game.gameState} />
          {game.conflictCount > 0 && (
            <StatusChip status="urgent" label={`${game.conflictCount} con conflicto`} />
          )}
        </Stack>
      </Box>

      {action}
    </Stack>
  )
}
