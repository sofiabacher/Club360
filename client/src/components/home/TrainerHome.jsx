import { useCallback } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid'
import LinearProgress from '@mui/material/LinearProgress'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import CalendarMonthRounded from '@mui/icons-material/CalendarMonthRounded'
import EventNoteRounded from '@mui/icons-material/EventNoteRounded'
import InsightsRounded from '@mui/icons-material/InsightsRounded'

import ActionLink from '../common/ActionLink.jsx'
import { getRoutineCategories, getRoutineWeek, getTracking } from '../../api/routines.api.js'
import StatusChip from '../common/StatusChip.jsx'
import { DayPills, shiftDate } from '../routines/RoutineWeekView.jsx'
import HomeBlock from './HomeBlock.jsx'
import HomeHeader from './HomeHeader.jsx'
import QuickAccess from './QuickAccess.jsx'
import StatCard from './StatCard.jsx'
import useBlock from './useBlock.js'
import usePermission from '../../hooks/usePermission.js'
import { ROUTINE_DAYS } from '../../utils/constants.js'

const plural = (count, one, many) => (count === 1 ? one : many)
const loadedDays = (week) => week.days.filter((day) => day.routine).length

// Por cada categoría del alcance: la semana actual, la que viene y, con el permiso, el seguimiento de la semana
async function loadCategories(withTracking) {
  const { data } = await getRoutineCategories()
  const categories = await Promise.all(data.categories.map(async (category) => {
    const current = (await getRoutineWeek(category.id)).data
    const next = (await getRoutineWeek(category.id, shiftDate(current.currentWeekStart, 7))).data
    const tracking = withTracking ? (await getTracking(category.id)).data : null
    const values = (tracking?.players ?? []).map((player) => player.compliance).filter((value) => value !== null)
    const compliance = values.length > 0 ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : null
    return { category, current, next, compliance, players: tracking?.players.length ?? null }
  }))
  return { data: { categories } }
}

// Frase de lo más urgente: categorías sin la rutina de la semana que viene o de esta semana
function urgentPhrase(categories) {
  const missingNext = categories.filter((item) => loadedDays(item.next) === 0).length
  if (missingNext > 0) return `Te falta cargar la rutina de la semana que viene en ${missingNext} ${plural(missingNext, 'categoría', 'categorías')}.`
  const missingNow = categories.filter((item) => loadedDays(item.current) < ROUTINE_DAYS.length).length
  if (missingNow > 0) return `Hay ${missingNow} ${plural(missingNow, 'categoría', 'categorías')} con días sin rutina esta semana.`
  return 'Tus rutinas están al día.'
}

// Una categoría: los días cargados de esta semana y de la que viene, y el cumplimiento promedio de la semana
function CategoryCard({ item, canTrack }) {
  const { category, current, next, compliance } = item
  const nextLoaded = loadedDays(next)

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
        <Typography variant="h6" component="h3" sx={{ color: 'navy.main' }}>{category.name}</Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>{category.league.name}</Typography>

        <Typography variant="overline" sx={{ color: 'text.secondary' }}>Esta semana</Typography>
        <DayPills days={current.days} today={current.today} size="small" />

        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mt: 2, gap: 1 }}>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>Semana que viene</Typography>
          <StatusChip
            status={nextLoaded === 0 ? 'urgent' : nextLoaded < ROUTINE_DAYS.length ? 'pending' : 'ok'}
            label={`${nextLoaded} de ${ROUTINE_DAYS.length} días`}
          />
        </Stack>

        {canTrack && (
          <Box sx={{ mt: 2 }}>
            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>Cumplimiento de la semana</Typography>
              <Typography variant="numeric" sx={{ fontSize: '1.3rem', color: 'navy.main' }}>{compliance === null ? '—' : `${compliance} %`}</Typography>
            </Stack>
            <LinearProgress variant="determinate" value={compliance ?? 0} color="secondary" sx={{ height: 6, borderRadius: 3, mt: 0.5 }} />
          </Box>
        )}

        <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
          <ActionLink to="/routines">Rutinas</ActionLink>
          {canTrack && <ActionLink to="/routines/tracking">Seguimiento</ActionLink>}
        </Stack>
      </CardContent>
    </Card>
  )
}

// Panel de inicio de la Preparadora física (routines.manage): qué rutinas faltan cargar (esta semana y la que viene),
// y, con routines.viewTracking, el cumplimiento promedio de cada categoría. Botón Naranja "Cargar rutinas" solo si
// falta la semana que viene en alguna categoría
export default function TrainerHome() {
  const { hasPermission } = usePermission()
  const canTrack = hasPermission('routines.viewTracking')
  const request = useCallback(() => loadCategories(canTrack), [canTrack])
  const block = useBlock(request)

  const categories = block.data?.categories ?? []
  const missingNext = categories.filter((item) => loadedDays(item.next) === 0).length
  const thisWeek = categories.reduce((sum, item) => sum + loadedDays(item.current), 0)
  const compliances = categories.map((item) => item.compliance).filter((value) => value !== null)
  const average = compliances.length > 0 ? Math.round(compliances.reduce((sum, value) => sum + value, 0) / compliances.length) : null

  const action = missingNext > 0 && (
    <Button component={RouterLink} to="/routines" variant="contained" color="primary">Cargar rutinas</Button>
  )

  return (
    <Stack spacing={3}>
      <HomeHeader ready={!block.loading} phrase={block.error ? 'No pudimos cargar tus rutinas.' : urgentPhrase(categories)} action={action} />

      <Grid container spacing={2}>
        <Grid size={{ xs: 6, md: 4 }}>
          <StatCard label="Rutinas cargadas esta semana" value={thisWeek} to="/routines" block={block} icon={EventNoteRounded} highlight={false}
            hint={`de ${categories.length * ROUTINE_DAYS.length} posibles`} />
        </Grid>
        <Grid size={{ xs: 6, md: 4 }}>
          <StatCard label="Categorías sin la semana que viene" value={missingNext} to="/routines" block={block} icon={CalendarMonthRounded} />
        </Grid>
        {canTrack && (
          <Grid size={{ xs: 12, md: 4 }}>
            <StatCard label="Cumplimiento promedio" value={average === null ? '—' : `${average} %`} to="/routines/tracking" block={block} icon={InsightsRounded} highlight={false} />
          </Grid>
        )}
      </Grid>

      {(block.loading || block.error) && <HomeBlock loading={block.loading} error={block.error} height={200} />}
      {block.data && categories.length === 0 && (
        <HomeBlock><Typography sx={{ color: 'text.secondary' }}>Todavía no tenés categorías asignadas.</Typography></HomeBlock>
      )}
      <Grid container spacing={2}>
        {categories.map((item) => (
          <Grid key={item.category.id} size={{ xs: 12, sm: 6, lg: 4 }}>
            <CategoryCard item={item} canTrack={canTrack} />
          </Grid>
        ))}
      </Grid>

      <QuickAccess />
    </Stack>
  )
}
