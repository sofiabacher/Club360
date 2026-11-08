import { useEffect, useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import Typography from '@mui/material/Typography'
import FitnessCenterRounded from '@mui/icons-material/FitnessCenterRounded'

import { getMyRoutine } from '../../api/routines.api.js'
import EmptyState from '../../components/common/EmptyState.jsx'
import RoutineWeekView, { defaultDayOf } from '../../components/routines/RoutineWeekView.jsx'
import { getErrorMessage } from '../../utils/apiErrors.js'

// Mi rutina (routines.viewOwn): la semana actual con el día de hoy elegido. Si está en más de una categoría, una
// pestaña por categoría con el nombre de la liga. Se puede ir a semanas pasadas y futuras
export default function MyRoutinePage() {
  const [weekStart, setWeekStart] = useState(null)   // null: la semana actual
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState(0)
  const [selectedDay, setSelectedDay] = useState(null)

  useEffect(() => {
    setLoading(true)
    getMyRoutine(weekStart ?? undefined)
      .then(({ data: result }) => {
        setData(result)
        setError('')
        const first = result.categories[0]
        if (first) setSelectedDay(defaultDayOf({ ...result, days: first.days }))
      })
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false))
  }, [weekStart])

  if (error && !data) return <Alert severity="error">{error}</Alert>
  if (!data) return <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}><CircularProgress color="secondary" /></Box>

  const header = (
    <Box sx={{ mb: 3 }}>
      <Typography variant="h5" component="h2" sx={{ color: 'navy.main' }}>Mi rutina</Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>La rutina de cada día de entrenamiento, que carga la preparadora física.</Typography>
    </Box>
  )

  if (data.categories.length === 0) {
    return (
      <>
        {header}
        <EmptyState icon={FitnessCenterRounded} title="Sin rutina" description="Todavía no estás en ninguna categoría." />
      </>
    )
  }

  const current = data.categories[Math.min(tab, data.categories.length - 1)]

  return (
    <>
      {header}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {data.categories.length > 1 && (
        <Tabs
          value={Math.min(tab, data.categories.length - 1)}
          onChange={(event, value) => setTab(value)}
          textColor="secondary"
          indicatorColor="secondary"
          variant="scrollable"
          allowScrollButtonsMobile
          sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
        >
          {data.categories.map((item) => <Tab key={item.category.id} label={`${item.league.name} · ${item.category.name}`} />)}
        </Tabs>
      )}

      <RoutineWeekView
        week={{ ...data, days: current.days }}
        selectedDay={selectedDay}
        onSelectDay={setSelectedDay}
        onChangeWeek={setWeekStart}
        loading={loading}
      />
    </>
  )
}
