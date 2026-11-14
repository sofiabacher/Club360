import { useCallback, useEffect, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardActionArea from '@mui/material/CardActionArea'
import CardContent from '@mui/material/CardContent'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import Link from '@mui/material/Link'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import { getGameOptions, getGames } from '../../api/games.api.js'
import { getInscriptions } from '../../api/inscriptions.api.js'
import { CategoryCampaign } from '../games/CampaignCard.jsx'
import { HomeChip } from '../games/GameChips.jsx'
import HomeBlock from './HomeBlock.jsx'
import QuickAccess from './QuickAccess.jsx'
import { initialBlock } from './homeData.js'
import useAuth from '../../hooks/useAuth.js'
import { getErrorMessage } from '../../utils/apiErrors.js'
import { GAME_STATES, INSCRIPTION_STATES } from '../../utils/constants.js'
import { formatGameDate } from '../../utils/format.js'

const UPCOMING_COUNT = 5
const NO_RESULT_PATH = '/games?withoutResult=true'

// Hoy como 'AAAA-MM-DD' (hora de la computadora), como el filtro del fixture
const todayKey = () => {
  const now = new Date()
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}

// Carga un bloque del panel con su propia llamada: { data, error, loading }
function useBlock(request) {
  const [block, setBlock] = useState(initialBlock)

  const load = useCallback(() => {
    request()
      .then(({ data }) => setBlock({ data, error: '', loading: false }))
      .catch((err) => setBlock({ data: null, error: getErrorMessage(err), loading: false }))
  }, [request])

  useEffect(() => { load() }, [load])
  return block
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

// Tarjeta chica de un pendiente: la cantidad y un link. Carga y falla por separado
function PendingCard({ label, count, to, block }) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardActionArea component={RouterLink} to={to} sx={{ height: '100%' }}>
        <CardContent sx={{ p: 2 }}>
          {block.loading && <Skeleton variant="text" width={60} height={48} />}
          {!block.loading && block.error && <Typography variant="body2" sx={{ color: 'error.main' }}>{block.error}</Typography>}
          {!block.loading && !block.error && (
            <Typography variant="numeric" component="p" sx={{ fontSize: '2.4rem', color: count > 0 ? 'primary.main' : 'navy.main' }}>{count}</Typography>
          )}
          <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>{label}</Typography>
        </CardContent>
      </CardActionArea>
    </Card>
  )
}

// Panel de inicio del Representante (games.manage + inscriptions.approve): la frase de lo más urgente, los pendientes
// (inscripciones, partidos sin resultado y conflictos), la campaña de cada categoría de su alcance agrupada por liga y
// los próximos partidos. Cada bloque carga y falla por separado. El único botón naranja, "Cargar resultado", aparece
// solo si hay partidos jugados sin resultado
export default function RepresentativeHome() {
  const { user } = useAuth()
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
      <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ justifyContent: 'space-between', alignItems: { sm: 'flex-end' }, gap: 2 }}>
        <Box>
          <Typography variant="h4" component="h2" sx={{ color: 'navy.main' }}>Hola, {user.name}</Typography>
          {headerReady
            ? <Typography sx={{ color: 'text.secondary', mt: 0.5 }}>{urgentPhrase({ inscriptions, noResult, upcoming })}</Typography>
            : <Skeleton variant="text" width={280} />}
        </Box>
        {withoutResult > 0 && (
          <Button component={RouterLink} to={NO_RESULT_PATH} variant="contained" color="primary" sx={{ flexShrink: 0 }}>
            Cargar resultado
          </Button>
        )}
      </Stack>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <PendingCard label="Inscripciones por aprobar" count={inscriptions.data?.total ?? 0} to="/inscriptions" block={inscriptions} />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <PendingCard label="Partidos sin resultado" count={withoutResult} to={NO_RESULT_PATH} block={noResult} />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <PendingCard label="Conflictos sin resolver" count={upcoming.data?.unresolvedConflicts ?? 0} to="/games" block={upcoming} />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Stack spacing={2}>
            <Typography variant="overline" component="h3" sx={{ color: 'text.secondary', letterSpacing: 1.5 }}>Campaña de tus categorías</Typography>
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
            <Link component={RouterLink} to="/games" color="secondary" sx={{ display: 'inline-block', mt: 1.5, fontWeight: 600 }}>Ver partidos</Link>
          </HomeBlock>
        </Grid>
      </Grid>

      <QuickAccess />
    </Stack>
  )
}
