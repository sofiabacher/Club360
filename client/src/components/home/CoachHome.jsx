import { Link as RouterLink } from 'react-router-dom'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import AssignmentIndRounded from '@mui/icons-material/AssignmentIndRounded'
import EventBusyRounded from '@mui/icons-material/EventBusyRounded'
import HourglassTopRounded from '@mui/icons-material/HourglassTopRounded'
import WarningAmberRounded from '@mui/icons-material/WarningAmberRounded'

import ActionLink from '../common/ActionLink.jsx'
import { getCoachGames } from '../../api/citations.api.js'
import { getConflicts } from '../../api/games.api.js'
import { getMyCategories } from '../../api/leagues.api.js'
import StatusChip from '../common/StatusChip.jsx'
import { HomeChip } from '../games/GameChips.jsx'
import HomeBlock from './HomeBlock.jsx'
import HomeHeader from './HomeHeader.jsx'
import QuickAccess from './QuickAccess.jsx'
import StatCard from './StatCard.jsx'
import useBlock from './useBlock.js'
import usePermission from '../../hooks/usePermission.js'
import { formatGameDate, formatWeekdayDay } from '../../utils/format.js'

const UPCOMING_COUNT = 5

const plural = (count, one, many) => (count === 1 ? one : many)

// Partidos con la ventana de citación abierta y sin ninguna jugadora citada todavía
const toCiteOf = (games) => games.filter((game) => game.canCite && game.citationWindow?.status === 'OPEN' && game.summary.cited === 0)
const sumOf = (games, key) => games.reduce((total, game) => total + (game.summary?.[key] ?? 0), 0)

// Frase de lo más urgente: partidos para citar, conflictos, respuestas pendientes o el próximo partido
function urgentPhrase({ games, conflicts }) {
  const items = games.data?.items ?? []
  const toCite = toCiteOf(items)
  if (toCite.length > 0) return `Tenés ${toCite.length} ${plural(toCite.length, 'partido para citar', 'partidos para citar')}.`
  const open = (conflicts.data?.conflicts ?? []).filter((conflict) => !conflict.resolved).length
  if (open > 0) return `Hay ${open} ${plural(open, 'conflicto de horario sin resolver', 'conflictos de horario sin resolver')}.`
  const pending = sumOf(items, 'pending')
  if (pending > 0) return `Hay ${pending} ${plural(pending, 'jugadora que todavía no respondió', 'jugadoras que todavía no respondieron')} su citación.`
  const next = [...items].sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime))[0]
  if (next) return `Tu próximo partido es el ${formatWeekdayDay(next.dateTime)}.`
  return 'No tenés partidos programados.'
}

// Estado de la citación de un partido para la entrenadora
function CitationState({ game }) {
  const { status, opensAt } = game.citationWindow ?? {}
  if (game.summary.cited > 0) {
    const { cited, confirmed, pending, rejected } = game.summary
    return (
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {cited} {plural(cited, 'citada', 'citadas')} · {confirmed} {plural(confirmed, 'confirmó', 'confirmaron')}
        {pending > 0 && ` · ${pending} sin responder`}{rejected > 0 && ` · ${rejected} no ${plural(rejected, 'puede', 'pueden')}`}
      </Typography>
    )
  }
  if (status === 'OPEN') return <StatusChip status="urgent" label="Para citar" />
  if (status === 'NOT_YET_OPEN') return <StatusChip status="pending" label={`Se cita desde el ${formatWeekdayDay(opensAt)}`} />
  return <StatusChip status="overdue" label="Sin citación" />
}

// Panel de inicio de la Entrenadora (citations.create): lo que hay que atender (partidos para citar, respuestas,
// rechazos y conflictos), los próximos partidos con el estado de la citación y sus categorías. El único botón
// Naranja, "Citar jugadoras", lleva al partido más cercano que todavía no tiene citación
export default function CoachHome() {
  const { hasPermission } = usePermission()
  const canConflicts = hasPermission('games.resolveConflicts')
  const canCategories = hasPermission('leagues.viewAssigned')

  const games = useBlock(getCoachGames)
  const conflicts = useBlock(getConflicts, canConflicts)
  const categories = useBlock(getMyCategories, canCategories)

  const items = [...(games.data?.items ?? [])].sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime))
  const toCite = toCiteOf(items)
  const openConflicts = (conflicts.data?.conflicts ?? []).filter((conflict) => !conflict.resolved).length
  const headerReady = !games.loading && !conflicts.loading

  const action = toCite.length > 0 && (
    <Button component={RouterLink} to={`/citations/games/${toCite[0].id}`} variant="contained" color="primary">Citar jugadoras</Button>
  )

  return (
    <Stack spacing={3}>
      <HomeHeader ready={headerReady} phrase={urgentPhrase({ games, conflicts })} action={action} />

      <Grid container spacing={2}>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard label="Partidos para citar" value={toCite.length} to="/citations" block={games} icon={AssignmentIndRounded} />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard label="Respuestas pendientes" value={sumOf(items, 'pending')} to="/citations" block={games} icon={HourglassTopRounded} />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard label="No pueden ir" value={sumOf(items, 'rejected')} to="/citations" block={games} icon={EventBusyRounded} />
        </Grid>
        {canConflicts && (
          <Grid size={{ xs: 6, md: 3 }}>
            <StatCard label="Conflictos sin resolver" value={openConflicts} to="/games/assigned" block={conflicts} icon={WarningAmberRounded} />
          </Grid>
        )}
      </Grid>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 7 }}>
          <HomeBlock title="Próximos partidos" loading={games.loading} error={games.error} height={200}>
            {items.length === 0 && <Typography sx={{ color: 'text.secondary' }}>No hay partidos programados en tus categorías.</Typography>}
            <Stack divider={<Divider flexItem />}>
              {items.slice(0, UPCOMING_COUNT).map((game) => (
                <Stack key={game.id} direction={{ xs: 'column', sm: 'row' }} sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' }, gap: 1, py: 1.25 }}>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="numeric" component="p" sx={{ fontSize: '1.3rem', color: 'navy.main' }}>{formatGameDate(game.dateTime)}</Typography>
                    <Stack direction="row" sx={{ alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                      <Typography sx={{ fontWeight: 600, color: 'navy.main', overflowWrap: 'anywhere' }}>{game.category.name} vs. {game.rival}</Typography>
                      <HomeChip isHome={game.isHome} />
                    </Stack>
                    <Box sx={{ mt: 0.5 }}><CitationState game={game} /></Box>
                  </Box>
                  <ActionLink to={`/citations/games/${game.id}`} sx={{ flexShrink: 0 }}>Ver citación</ActionLink>
                </Stack>
              ))}
            </Stack>
            <ActionLink to="/citations" sx={{ mt: 1.5 }}>Ver todas las citaciones</ActionLink>
          </HomeBlock>
        </Grid>

        {canCategories && (
          <Grid size={{ xs: 12, md: 5 }}>
            <HomeBlock title="Mis categorías" loading={categories.loading} error={categories.error} height={140}>
              {categories.data && categories.data.categories.length === 0 && (
                <Typography sx={{ color: 'text.secondary' }}>Todavía no tenés categorías asignadas.</Typography>
              )}
              <Stack divider={<Divider flexItem />}>
                {(categories.data?.categories ?? []).map((category) => (
                  <Stack key={category.id} direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', gap: 1, py: 1.25 }}>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 600, color: 'navy.main' }}>{category.name}</Typography>
                      <Typography variant="body2" sx={{ color: 'text.secondary' }} noWrap>{category.league.name}</Typography>
                    </Box>
                    <Typography variant="body2" sx={{ color: 'text.secondary', flexShrink: 0 }}>
                      {category.players.length} {plural(category.players.length, 'jugadora', 'jugadoras')}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
              <ActionLink to="/my-categories" sx={{ mt: 1.5 }}>Ver mis categorías</ActionLink>
            </HomeBlock>
          </Grid>
        )}
      </Grid>

      <QuickAccess />
    </Stack>
  )
}
