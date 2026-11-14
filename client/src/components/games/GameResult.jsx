import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import StatusChip from '../common/StatusChip.jsx'
import { GAME_STATES } from '../../utils/constants.js'
import { hasResult, outcomeChip, scoreText, setsText } from '../../utils/results.js'

// Resultado de un partido Jugado en las listas y tarjetas: "3 – 1" en numeric, el chip Ganado o Perdido y, si hay
// detalle, los sets en chico. Un Jugado sin resultado muestra "Sin resultado" (action: el botón para cargarlo, opcional).
// Programados y Cancelados no muestran nada
export default function GameResult({ game, action, size = 'medium' }) {
  if (game.gameState !== GAME_STATES.PLAYED) return null

  if (!hasResult(game)) {
    return (
      <Stack direction="row" sx={{ alignItems: 'center', gap: 1.5, flexWrap: 'wrap', mt: 1 }}>
        <Typography variant="body2" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>Sin resultado</Typography>
        {action}
      </Stack>
    )
  }

  const chip = outcomeChip(game.outcome)
  const sets = setsText(game.setScores)

  return (
    <Stack sx={{ mt: 1 }}>
      <Stack direction="row" sx={{ alignItems: 'center', gap: 1.25, flexWrap: 'wrap' }}>
        <Typography variant="numeric" sx={{ fontSize: size === 'small' ? '1.3rem' : '1.6rem', color: 'navy.main', lineHeight: 1.1 }}>
          {scoreText(game)}
        </Typography>
        <StatusChip status={chip.status} label={chip.label} />
      </Stack>
      {sets && <Typography variant="caption" sx={{ color: 'text.secondary' }}>{sets}</Typography>}
    </Stack>
  )
}
