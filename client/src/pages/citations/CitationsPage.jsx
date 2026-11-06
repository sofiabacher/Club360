import { useEffect, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardActionArea from '@mui/material/CardActionArea'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import AssignmentIndRounded from '@mui/icons-material/AssignmentIndRounded'
import ChevronRightRounded from '@mui/icons-material/ChevronRightRounded'

import { getCoachGames } from '../../api/citations.api.js'
import CitationSummary from '../../components/citations/CitationSummary.jsx'
import EmptyState from '../../components/common/EmptyState.jsx'
import { HomeChip } from '../../components/games/GameChips.jsx'
import { getErrorMessage } from '../../utils/apiErrors.js'
import { formatGameDate } from '../../utils/format.js'

// Citaciones de la entrenadora (citations.create): los próximos partidos de sus categorías con el resumen de sus
// citaciones. Al tocar uno, se abre la lista de la categoría para citar
export default function CitationsPage() {
  const [games, setGames] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    getCoachGames()
      .then(({ data }) => setGames(data.items))
      .catch((err) => setError(getErrorMessage(err)))
  }, [])

  if (error) return <Alert severity="error">{error}</Alert>

  if (!games) {
    return <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}><CircularProgress color="secondary" /></Box>
  }

  return (
    <>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" component="h2" sx={{ color: 'navy.main' }}>Citaciones</Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Los próximos partidos de tus categorías. Se cita con al menos 2 días de anticipación.
        </Typography>
      </Box>

      {games.length === 0 ? (
        <EmptyState icon={AssignmentIndRounded} title="Sin partidos" description="No hay partidos próximos en tus categorías." />
      ) : (
        <Stack spacing={2}>
          {games.map((game) => (
            <Card key={game.id}>
              <CardActionArea component={RouterLink} to={`/citations/games/${game.id}`}>
                <CardContent sx={{ p: { xs: 2, sm: 2.5 }, display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>{game.category?.name} · {game.league?.name}</Typography>
                    <Typography variant="numeric" component="p" sx={{ fontSize: '1.6rem', color: 'navy.main' }}>{formatGameDate(game.dateTime)}</Typography>
                    <Typography sx={{ fontWeight: 600, color: 'navy.main', overflowWrap: 'anywhere' }}>vs. {game.rival}</Typography>
                    <Stack direction="row" sx={{ gap: 0.75, flexWrap: 'wrap', my: 1 }}>
                      <HomeChip isHome={game.isHome} />
                      {!game.canCite && <Chip label="Ya no se puede citar" size="small" sx={{ fontWeight: 600 }} />}
                    </Stack>
                    <CitationSummary summary={game.summary} />
                  </Box>
                  <ChevronRightRounded sx={{ color: 'text.secondary' }} />
                </CardContent>
              </CardActionArea>
            </Card>
          ))}
        </Stack>
      )}
    </>
  )
}
