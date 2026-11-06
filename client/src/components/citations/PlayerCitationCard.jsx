import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import PlaceRounded from '@mui/icons-material/PlaceRounded'

import CitationStateChip from './CitationStateChip.jsx'
import StatusChip from '../common/StatusChip.jsx'
import { HomeChip } from '../games/GameChips.jsx'
import { formatDeadline, formatGameDate, formatShortDateTime, formatTimeLeft } from '../../utils/format.js'

// Una citación vista por la jugadora o la familia, como la tarjeta del moodboard: el partido con la fecha en grande y,
// si está Pendiente y en plazo, el aviso de hasta cuándo responder y los botones "Confirmo" y "No puedo".
// readOnly (Familia): sin botones, con la nota de que responde la jugadora.
// Si la citación se canceló por un conflicto resuelto (conflict.notPlaying), se explica qué partido juega
export default function PlayerCitationCard({ citation, readOnly = false, busy = false, onConfirm, onReject }) {
  const { game, conflict, canRespond } = citation
  const notPlaying = Boolean(conflict?.notPlaying)

  return (
    <Card
      sx={{
        border: 2,
        borderColor: canRespond ? 'primary.main' : 'transparent',
        opacity: notPlaying ? 0.85 : 1
      }}
    >
      <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
        <Stack direction="row" sx={{ gap: 1, flexWrap: 'wrap', mb: 1 }}>
          {canRespond && (
            <StatusChip status="urgent" label={`Respondé antes de ${formatDeadline(citation.dateMaxResponse)} · ${formatTimeLeft(citation.dateMaxResponse)}`} />
          )}
          {notPlaying && <Chip label="No jugás este partido" size="small" sx={{ fontWeight: 600 }} />}
          {!canRespond && !notPlaying && <CitationStateChip citation={citation} />}
        </Stack>

        <Typography variant="overline" sx={{ color: 'text.secondary', letterSpacing: 1.5 }}>
          {game.category?.name} · {game.league?.name}
        </Typography>
        <Typography variant="numeric" component="p" sx={{ fontSize: { xs: '1.9rem', sm: '2.3rem' }, color: 'navy.main' }}>
          {formatGameDate(game.dateTime)}
        </Typography>
        <Typography sx={{ fontWeight: 600, color: 'navy.main', overflowWrap: 'anywhere' }}>vs. {game.rival}</Typography>
        <Stack direction="row" sx={{ alignItems: 'center', gap: 0.5, color: 'text.secondary', mt: 0.5, flexWrap: 'wrap' }}>
          <HomeChip isHome={game.isHome} />
          <PlaceRounded sx={{ fontSize: 16, ml: 0.5 }} />
          <Typography variant="body2" sx={{ overflowWrap: 'anywhere' }}>{game.address}</Typography>
        </Stack>

        {notPlaying && (
          <Typography variant="body2" sx={{ mt: 1.5, color: 'navy.main' }}>
            No jugás este partido. Por superposición de horario se decidió que juegues {conflict.chosenGame.categoryName} vs.{' '}
            {conflict.chosenGame.rival} ({formatShortDateTime(conflict.chosenGame.dateTime)}).
          </Typography>
        )}

        {citation.justification && !notPlaying && (
          <Typography variant="body2" sx={{ mt: 1.5, color: 'text.secondary', fontStyle: 'italic', overflowWrap: 'anywhere' }}>
            "{citation.justification}"
          </Typography>
        )}

        {canRespond && readOnly && (
          <Typography variant="body2" sx={{ mt: 1.5, color: 'text.secondary' }}>La citación la responde la jugadora.</Typography>
        )}

        {canRespond && !readOnly && (
          <Box sx={{ display: 'flex', gap: 1.5, mt: 2, flexWrap: 'wrap' }}>
            <Button variant="contained" color="primary" onClick={() => onConfirm(citation)} loading={busy}>Confirmo</Button>
            <Button variant="outlined" color="secondary" onClick={() => onReject(citation)} disabled={busy}>No puedo</Button>
          </Box>
        )}
      </CardContent>
    </Card>
  )
}
