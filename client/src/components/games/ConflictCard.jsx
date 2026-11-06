import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import StatusChip from '../common/StatusChip.jsx'
import { formatGameDate } from '../../utils/format.js'
import { overlapText } from '../../utils/games.js'

// Uno de los dos partidos del conflicto, con la marca de "juega acá" si es el elegido
function ConflictGame({ game, chosen }) {
  return (
    <Paper variant="outlined" sx={{ p: 1.5, height: '100%', borderColor: chosen ? 'success.main' : 'divider', borderWidth: chosen ? 2 : 1 }}>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>{game.category?.name} · {game.league?.name}</Typography>
      <Typography variant="numeric" component="p" sx={{ fontSize: '1.3rem', color: 'navy.main' }}>{formatGameDate(game.dateTime)}</Typography>
      <Typography sx={{ fontWeight: 600, color: 'navy.main', overflowWrap: 'anywhere' }}>vs. {game.rival}</Typography>
      {chosen && <Typography variant="caption" sx={{ color: 'success.main', fontWeight: 600 }}>Juega en este</Typography>}
    </Paper>
  )
}

// Un conflicto de horario: la jugadora, los dos partidos lado a lado, cuánto se superponen y su estado.
// Pendiente: botón "Resolver" (onResolve). Resuelto: en qué categoría juega, quién lo resolvió y la nota
export default function ConflictCard({ conflict, margin, onResolve }) {
  const { member, games, resolved, resolution } = conflict
  const chosen = resolved ? games.find((game) => game.id === resolution.chosenGameId) : null

  return (
    <Card>
      <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap', mb: 1.5 }}>
          <Typography variant="h6" component="h3" sx={{ color: 'navy.main' }}>{member.name}</Typography>
          {resolved
            ? <StatusChip status="ok" label={`Resuelto: juega en ${chosen?.category?.name ?? 'el partido elegido'}`} />
            : <StatusChip status="urgent" label="Pendiente" />}
        </Stack>

        <Grid container spacing={1.5}>
          {games.map((game) => (
            <Grid key={game.id} size={{ xs: 12, sm: 6 }}>
              <ConflictGame game={game} chosen={chosen?.id === game.id} />
            </Grid>
          ))}
        </Grid>

        <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1.5 }}>{overlapText(conflict, margin)}</Typography>

        {resolved && (
          <Box sx={{ mt: 1.5 }}>
            <Typography variant="body2" sx={{ color: 'navy.main' }}>
              Lo resolvió {resolution.resolvedBy ?? 'una entrenadora'}.
            </Typography>
            {resolution.note && (
              <Typography variant="body2" sx={{ color: 'text.secondary', fontStyle: 'italic', overflowWrap: 'anywhere' }}>"{resolution.note}"</Typography>
            )}
          </Box>
        )}

        {!resolved && onResolve && (
          <Box sx={{ mt: 2 }}>
            <Button variant="contained" color="secondary" onClick={() => onResolve(conflict)}>Resolver</Button>
          </Box>
        )}
      </CardContent>
    </Card>
  )
}
