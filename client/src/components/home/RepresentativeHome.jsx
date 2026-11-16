import { Link as RouterLink } from 'react-router-dom'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import ActionLink from '../common/ActionLink.jsx'
import { getGameOptions, getGames } from '../../api/games.api.js'
import { getInscriptions } from '../../api/inscriptions.api.js'
import { CategoryCampaign } from '../games/CampaignCard.jsx'
import { HomeChip } from '../games/GameChips.jsx'
import HomeBlock from './HomeBlock.jsx'
import HomeHeader from './HomeHeader.jsx'
import StatCard from './StatCard.jsx'
import QuickAccess from './QuickAccess.jsx'
import { GAME_STATES, INSCRIPTION_STATES } from '../../utils/constants.js'
import { formatGameDate } from '../../utils/format.js'
import useBlock from './useBlock.js'

const UPCOMING_COUNT = 5
const NO_RESULT_PATH = '/games?withoutResult=true'

// Hoy como 'AAAA-MM-DD' (hora de la computadora), como el filtro del fixture
const todayKey = () => {
  const now = new Date()
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}

// Cada bloque con su llamada a un endpoint que ya existe
const pendingInscriptions = () => getInscriptions({ state: INSCRIPTION_STATES.PENDING })
const gamesWithoutResult = () => getGames({ withoutResult: true, page: 1 })
// Próximos Programados: trae también los conflictos sin resolver del alcance (unresolvedConflicts)
const upcomingGames = () => getGames({ state: GAME_STATES.SCHEDULED, from: todayKey(), page: 1 })

const plural = (count, one, many) => (count === 1 ? one : many)

// Frase de lo más urgente: inscripciones pendientes, partidos sin resultado, conflictos o "Todo al día"
function urgentPhrase({ inscriptions, noResult, upcoming }) {
  const pending = inscriptions.data?.total ?? 0
  if (pending > 0) return `Tenés ${pending} ${plural(pending, 'inscripción pendiente', 'inscripciones pendientes')}.`
  const withoutResult = noResult.data?.total ?? 0
  if (withoutResult > 0) return `Hay ${withoutResult} ${plural(withoutResult, 'partido jugado sin resultado', 'partidos jugados sin resultado')}.`
  const conflicts = upcoming.data?.unresolvedConflicts ?? 0
  if (conflicts > 0) return `Hay ${conflicts} ${plural(conflicts, 'conflicto de horario sin resolver', 'conflictos de horario sin resolver')}.`
  return 'Todo al día.'
}

// Panel de inicio del Representante (games.manage + inscriptions.approve): la frase de lo más urgente, los pendientes
// (inscripciones, partidos sin resultado y conflictos), la campaña de cada categoría de su alcance agrupada por liga y
// los próximos partidos. Cada bloque carga y falla por separado. El único botón naranja, "Cargar resultado", aparece
// solo si hay partidos jugados sin resultado
export default function RepresentativeHome() {
  const inscriptions = useBlock(pendingInscriptions)
  const noResult = useBlock(gamesWithoutResult)
  const upcoming = useBlock(upcomingGames)
  const options = useBlock(getGameOptions)

  const headerReady = !inscriptions.loading && !noResult.loading && !upcoming.loading
  const withoutResult = noResult.data?.total ?? 0

  // Categorías del alcance agrupadas por liga
  const leagues = new Map()
  for (const category of options.data?.categories ?? []) {
    leagues.set(category.league.id, { league: category.league, categories: [...(leagues.get(category.league.id)?.categories ?? []), category] })
  }

  const nextGames = (upcoming.data?.items ?? []).slice(0, UPCOMING_COUNT)

  return (
    <Stack spacing={3}>
      <HomeHeader
        ready={headerReady}
        phrase={urgentPhrase({ inscriptions, noResult, upcoming })}
        action={withoutResult > 0 && (
          <Button component={RouterLink} to={NO_RESULT_PATH} variant="contained" color="primary">Cargar resultado</Button>
        )}
      />

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <StatCard label="Inscripciones por aprobar" value={inscriptions.data?.total ?? 0} to="/inscriptions" block={inscriptions} />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <StatCard label="Partidos sin resultado" value={withoutResult} to={NO_RESULT_PATH} block={noResult} />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <StatCard label="Conflictos sin resolver" value={upcoming.data?.unresolvedConflicts ?? 0} to="/games" block={upcoming} />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Stack spacing={2}>
            <Typography variant="overline" component="h3" sx={{ color: 'text.secondary' }}>Campaña de tus categorías</Typography>
            {(options.loading || options.error) && <HomeBlock loading={options.loading} error={options.error} height={160} />}
            {options.data && leagues.size === 0 && (
              <HomeBlock><Typography sx={{ color: 'text.secondary' }}>Todavía no hay categorías activas.</Typography></HomeBlock>
            )}
            {[...leagues.values()].map(({ league, categories }) => (
              <Stack key={league.id} spacing={1.5}>
                <Typography variant="subtitle1" component="h4" sx={{ fontWeight: 600, color: 'navy.main' }}>{league.name}</Typography>
                {categories.map((category) => <CategoryCampaign key={category.id} categoryId={category.id} showPending />)}
              </Stack>
            ))}
          </Stack>
        </Grid>

        <Grid size={{ xs: 12, md: 5 }}>
          <HomeBlock title="Próximos partidos" loading={upcoming.loading} error={upcoming.error} height={160}>
            {nextGames.length === 0 && <Typography sx={{ color: 'text.secondary' }}>No hay partidos programados.</Typography>}
            <Stack divider={<Divider flexItem />}>
              {nextGames.map((game) => (
                <Box key={game.id} sx={{ py: 1.25 }}>
                  <Typography variant="numeric" component="p" sx={{ fontSize: '1.3rem', color: 'navy.main' }}>{formatGameDate(game.dateTime)}</Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>{game.category?.name} · {game.league?.name}</Typography>
                  <Stack direction="row" sx={{ alignItems: 'center', gap: 1, flexWrap: 'wrap', mt: 0.25 }}>
                    <Typography sx={{ fontWeight: 600, color: 'navy.main', overflowWrap: 'anywhere' }}>vs. {game.rival}</Typography>
                    <HomeChip isHome={game.isHome} />
                  </Stack>
                </Box>
              ))}
            </Stack>
            <ActionLink to="/games" sx={{ mt: 1.5 }}>Ver partidos</ActionLink>
          </HomeBlock>
        </Grid>
      </Grid>

      <QuickAccess />
    </Stack>
  )
}
