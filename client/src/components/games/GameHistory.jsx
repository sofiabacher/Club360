import { useEffect, useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import FormControlLabel from '@mui/material/FormControlLabel'
import MenuItem from '@mui/material/MenuItem'
import Pagination from '@mui/material/Pagination'
import Stack from '@mui/material/Stack'
import Switch from '@mui/material/Switch'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import HistoryRounded from '@mui/icons-material/HistoryRounded'

import EmptyState from '../common/EmptyState.jsx'
import StatusChip from '../common/StatusChip.jsx'
import { CategoryCampaign } from './CampaignCard.jsx'
import { HomeChip } from './GameChips.jsx'
import GameResult from './GameResult.jsx'
import { getGamesHistory } from '../../api/games.api.js'
import { getErrorMessage } from '../../utils/apiErrors.js'
import { CITATION_STATES, GAME_STATES } from '../../utils/constants.js'
import { formatGameDate } from '../../utils/format.js'
import LoadingSkeleton from '../common/LoadingSkeleton.jsx'

// Chip de la citación de la jugadora en un partido ya pasado. Sin citación, "No citada"
function citationChip(citation) {
  if (!citation) return { status: 'neutral', label: 'No citada' }
  switch (citation.citationState) {
    case CITATION_STATES.CONFIRMED: return { status: 'ok', label: 'Confirmada' }
    case CITATION_STATES.AUTO_CONFIRMED: return { status: 'ok', label: 'Confirmada automáticamente' }
    case CITATION_STATES.REJECTED: return { status: 'overdue', label: 'Rechazada' }
    case CITATION_STATES.CANCELLED: return { status: 'overdue', label: 'Cancelada' }
    default: return { status: 'pending', label: 'Pendiente' }
  }
}

const plural = (count, one, many) => `${count} ${count === 1 ? one : many}`

// "12 citadas · 10 confirmadas · 1 rechazada" (y las canceladas, si hay)
function summaryText(summary) {
  if (summary.cited === 0 && summary.cancelled === 0) return 'Sin citaciones'
  return [
    plural(summary.cited, 'citada', 'citadas'),
    plural(summary.confirmed, 'confirmada', 'confirmadas'),
    summary.rejected > 0 && plural(summary.rejected, 'rechazada', 'rechazadas'),
    summary.pending > 0 && plural(summary.pending, 'pendiente', 'pendientes'),
    summary.cancelled > 0 && plural(summary.cancelled, 'cancelada', 'canceladas')
  ].filter(Boolean).join(' · ')
}

// Un partido que ya pasó: fecha, rival, local o visitante, el resultado (o Cancelado, o "Resultado pendiente") y, según
// quién lo ve, la citación de la jugadora o el resumen de citaciones. thirdPerson: los textos para la Familia
function HistoryGameCard({ game, thirdPerson, showCategory }) {
  const cancelled = game.gameState === GAME_STATES.CANCELLED
  const pendingResult = game.gameState === GAME_STATES.SCHEDULED
  const chip = 'citation' in game ? citationChip(game.citation) : null

  return (
    <Card>
      <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ gap: { xs: 1, sm: 3 }, alignItems: { sm: 'flex-start' } }}>
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography variant="numeric" component="p" sx={{ fontSize: '1.4rem', color: 'navy.main', textDecoration: cancelled ? 'line-through' : 'none' }}>
              {formatGameDate(game.dateTime)}
            </Typography>
            {showCategory && <Typography variant="body2" sx={{ color: 'text.secondary' }}>{game.category?.name} · {game.league?.name}</Typography>}
            <Stack direction="row" sx={{ alignItems: 'center', gap: 1, flexWrap: 'wrap', mt: 0.25 }}>
              <Typography sx={{ fontWeight: 600, color: 'navy.main', overflowWrap: 'anywhere' }}>vs. {game.rival}</Typography>
              <HomeChip isHome={game.isHome} />
            </Stack>

            {chip && (
              <Stack direction="row" sx={{ alignItems: 'center', gap: 1, flexWrap: 'wrap', mt: 1 }}>
                <StatusChip status={chip.status} label={game.citation?.citationState === CITATION_STATES.REJECTED && game.citation.justification ? `Rechazada: ${game.citation.justification}` : chip.label} sx={{ maxWidth: '100%', height: 'auto', '& .MuiChip-label': { whiteSpace: 'normal', py: 0.25 } }} />
              </Stack>
            )}
            {game.conflict?.notPlaying && (
              <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
                {thirdPerson ? 'No jugó este partido (conflicto de horario).' : 'No jugaste este partido (conflicto de horario).'}
              </Typography>
            )}
            {game.citationSummary && (
              <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>{summaryText(game.citationSummary)}</Typography>
            )}
          </Box>

          <Box sx={{ flexShrink: 0, minWidth: { sm: 160 } }}>
            {cancelled && <StatusChip status="overdue" label="Cancelado" />}
            {pendingResult && <StatusChip status="pending" label="Resultado pendiente" />}
            <GameResult game={game} />
          </Box>
        </Stack>
      </CardContent>
    </Card>
  )
}

// Pestaña "Jugados" (historial de partidos): la campaña de la categoría elegida arriba, con los selectores de temporada y
// de categoría; la lista de los partidos que ya pasaron, el interruptor "Mostrar cancelados" y la paginación.
// kind: 'mine' (Jugadora), 'linked' (Familia, con memberId: se monta con key={memberId} para empezar de cero al cambiar de
// jugadora) o 'assigned' (Entrenadora)
export default function GameHistory({ kind, memberId }) {
  const [filters, setFilters] = useState({ season: '', categoryId: '', includeCancelled: true, page: 1 })
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    setLoading(true)
    getGamesHistory(kind, { ...filters, memberId })
      .then(({ data: result }) => {
        if (!active) return
        setData(result)
        setError('')
        // Sin categoría elegida, la primera (la campaña es de una categoría)
        if (!filters.categoryId && result.categories.length > 0) {
          setFilters((current) => ({ ...current, categoryId: result.categories[0].id }))
        }
      })
      .catch((err) => active && setError(getErrorMessage(err)))
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [kind, memberId, filters])

  const setFilter = (field) => (value) => setFilters((current) => ({ ...current, [field]: value, page: 1 }))

  if (error && !data) return <Alert severity="error">{error}</Alert>
  if (!data) return <LoadingSkeleton />

  if (data.categories.length === 0) {
    return <EmptyState icon={HistoryRounded} title="Sin partidos jugados" description="Todavía no hay categorías con partidos." />
  }

  const categoryId = filters.categoryId || data.categories[0].id

  return (
    <Stack spacing={2.5}>
      <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ gap: 2 }}>
        <TextField select label="Temporada" value={data.season} onChange={(event) => setFilter('season')(event.target.value)} size="small" sx={{ minWidth: 140 }}>
          {data.seasons.map((season) => <MenuItem key={season} value={season}>{season}</MenuItem>)}
        </TextField>
        {data.categories.length > 1 && (
          <TextField select label="Categoría" value={categoryId} onChange={(event) => setFilter('categoryId')(event.target.value)} size="small" sx={{ minWidth: 240 }}>
            {data.categories.map((category) => <MenuItem key={category.id} value={category.id}>{category.name} · {category.league.name}</MenuItem>)}
          </TextField>
        )}
      </Stack>

      <CategoryCampaign categoryId={categoryId} season={data.season} />

      <FormControlLabel
        control={<Switch checked={filters.includeCancelled} onChange={(event) => setFilter('includeCancelled')(event.target.checked)} color="secondary" />}
        label="Mostrar cancelados"
      />

      {error && <Alert severity="error">{error}</Alert>}

      {data.items.length === 0 ? (
        <EmptyState icon={HistoryRounded} title="Sin partidos jugados" description="Todavía no hay partidos jugados esta temporada." />
      ) : (
        <Stack spacing={1.5} sx={{ opacity: loading ? 0.6 : 1 }}>
          {data.items.map((game) => (
            <HistoryGameCard key={game.id} game={game} thirdPerson={kind === 'linked'} showCategory={data.categories.length > 1} />
          ))}
        </Stack>
      )}

      {data.totalPages > 1 && (
        <Stack sx={{ alignItems: 'center' }}>
          <Pagination count={data.totalPages} page={data.page} onChange={(event, page) => setFilters((current) => ({ ...current, page }))} color="secondary" />
        </Stack>
      )}
    </Stack>
  )
}
