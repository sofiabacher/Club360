import { useCallback, useEffect, useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemText from '@mui/material/ListItemText'
import MenuItem from '@mui/material/MenuItem'
import Snackbar from '@mui/material/Snackbar'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import FitnessCenterRounded from '@mui/icons-material/FitnessCenterRounded'

import { getRoutineCategories, getRoutineWeek, getRoutineWeeks } from '../../api/routines.api.js'
import EmptyState from '../common/EmptyState.jsx'
import { HomeChip } from '../games/GameChips.jsx'
import RoutineEditor from './RoutineEditor.jsx'
import RoutineWeekView, { defaultDayOf } from './RoutineWeekView.jsx'
import { getErrorMessage } from '../../utils/apiErrors.js'
import { formatDayMonth, formatGameDate } from '../../utils/format.js'

const categoryLabel = (category) => `${category.name} · ${category.league.name}`

// Partidos de la categoría en la semana, para ajustar las rutinas
function WeekGames({ games }) {
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" component="h3" sx={{ color: 'navy.main', mb: 1 }}>Partidos de la semana</Typography>
        {games.length === 0 ? (
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>No hay partidos esta semana.</Typography>
        ) : (
          <Stack divider={<Divider flexItem />}>
            {games.map((game) => (
              <Box key={game.id} sx={{ py: 1.25 }}>
                <Typography variant="numeric" sx={{ fontSize: '1.2rem', color: 'navy.main' }}>{formatGameDate(game.dateTime)}</Typography>
                <Stack direction="row" sx={{ alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: 'navy.main', overflowWrap: 'anywhere' }}>vs. {game.rival}</Typography>
                  <HomeChip isHome={game.isHome} />
                </Stack>
              </Box>
            ))}
          </Stack>
        )}
      </CardContent>
    </Card>
  )
}

// Historial: las semanas con rutinas cargadas, para saltar a cualquiera
function WeeksHistory({ weeks, selected, onSelect }) {
  return (
    <Card>
      <CardContent sx={{ pb: '8px !important' }}>
        <Typography variant="h6" component="h3" sx={{ color: 'navy.main' }}>Semanas cargadas</Typography>
        {weeks.length === 0 ? (
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1, mb: 1 }}>Todavía no hay rutinas cargadas en esta categoría.</Typography>
        ) : (
          <List dense sx={{ mx: -1, maxHeight: 320, overflowY: 'auto' }}>
            {weeks.map((week) => (
              <ListItemButton key={week.weekStart} selected={week.weekStart === selected} onClick={() => onSelect(week.weekStart)} sx={{ borderRadius: 2 }}>
                <ListItemText
                  primary={`Semana del ${formatDayMonth(week.weekStart)} al ${formatDayMonth(week.weekEnd)}`}
                  secondary={week.days === 1 ? '1 día cargado' : `${week.days} días cargados`}
                />
              </ListItemButton>
            ))}
          </List>
        )}
      </CardContent>
    </Card>
  )
}

// Pantalla de rutinas de la preparadora física (canEdit: carga en el lugar en las semanas editables) y de la
// entrenadora (solo lectura): selector de categoría, la semana con sus días, los partidos de la semana y el historial
export default function RoutinesWorkspace({ canEdit, title, description }) {
  const [categories, setCategories] = useState(null)
  const [categoryId, setCategoryId] = useState('')
  const [weekStart, setWeekStart] = useState(null)   // null: la semana actual
  const [week, setWeek] = useState(null)
  const [weeks, setWeeks] = useState([])
  const [selectedDay, setSelectedDay] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    getRoutineCategories()
      .then(({ data }) => {
        setCategories(data.categories)
        setCategoryId(data.categories[0]?.id ?? '')
      })
      .catch((err) => setError(getErrorMessage(err)))
  }, [])

  // keepDay: al recargar la misma semana (después de guardar) se queda en el día elegido
  const loadWeek = useCallback((keepDay = false) => {
    if (!categoryId) return
    setLoading(true)
    getRoutineWeek(categoryId, weekStart ?? undefined)
      .then(({ data }) => {
        setWeek(data)
        setError('')
        if (!keepDay) setSelectedDay(defaultDayOf(data))
      })
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false))
  }, [categoryId, weekStart])

  const loadWeeks = useCallback(() => {
    if (!categoryId) return
    getRoutineWeeks(categoryId)
      .then(({ data }) => setWeeks(data.items))
      .catch(() => setWeeks([]))
  }, [categoryId])

  useEffect(() => { loadWeek() }, [loadWeek])
  useEffect(() => { loadWeeks() }, [loadWeeks])

  const handleSaved = (message) => {
    setNotice(message)
    loadWeek(true)
    loadWeeks()
  }

  const changeCategory = (event) => {
    setCategoryId(event.target.value)
    setWeekStart(null)
  }

  if (error && !week) return <Alert severity="error">{error}</Alert>

  if (!categories) return <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}><CircularProgress color="secondary" /></Box>

  const header = (
    <Box sx={{ mb: 3 }}>
      <Typography variant="h5" component="h2" sx={{ color: 'navy.main' }}>{title}</Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>{description}</Typography>
    </Box>
  )

  if (categories.length === 0) {
    return (
      <>
        {header}
        <EmptyState icon={FitnessCenterRounded} title="Sin categorías" description="Todavía no tenés categorías asignadas." />
      </>
    )
  }

  const editable = canEdit && week?.editable

  return (
    <>
      {header}

      <TextField select label="Categoría" value={categoryId} onChange={changeCategory} size="small" sx={{ minWidth: 260, mb: 3, maxWidth: '100%' }}>
        {categories.map((category) => <MenuItem key={category.id} value={category.id}>{categoryLabel(category)}</MenuItem>)}
      </TextField>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {!week ? (
        <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}><CircularProgress color="secondary" /></Box>
      ) : (
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 8 }}>
            {canEdit && !week.editable && (
              <Alert severity="info" sx={{ mb: 2 }}>Las semanas pasadas son solo de consulta.</Alert>
            )}
            <RoutineWeekView
              week={week}
              selectedDay={selectedDay}
              onSelectDay={setSelectedDay}
              onChangeWeek={setWeekStart}
              loading={loading}
              renderDay={editable
                ? (day) => (
                  <RoutineEditor
                    key={`${week.category.id}-${week.weekStart}-${day.dayOfWeek}-${day.routine?.id ?? 'new'}-${day.routine?.updatedAt ?? ''}`}
                    categoryId={week.category.id}
                    weekStart={week.weekStart}
                    day={day}
                    onSaved={handleSaved}
                  />
                )
                : undefined}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Stack spacing={3}>
              <WeekGames games={week.games} />
              <WeeksHistory weeks={weeks} selected={week.weekStart} onSelect={setWeekStart} />
            </Stack>
          </Grid>
        </Grid>
      )}

      <Snackbar open={Boolean(notice)} autoHideDuration={5000} onClose={() => setNotice('')} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="success" variant="filled" onClose={() => setNotice('')}>{notice}</Alert>
      </Snackbar>
    </>
  )
}
