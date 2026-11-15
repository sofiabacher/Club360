import { useCallback, useEffect, useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CircularProgress from '@mui/material/CircularProgress'
import Snackbar from '@mui/material/Snackbar'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import AddRounded from '@mui/icons-material/AddRounded'
import InsightsRounded from '@mui/icons-material/InsightsRounded'
import LockOutlined from '@mui/icons-material/LockOutlined'

import { createGoal, getMyGoals, getMyProgress, setGoalState, updateGoal } from '../../api/routines.api.js'
import EmptyState from '../../components/common/EmptyState.jsx'
import GoalsList, { GoalDialog } from '../../components/routines/GoalsList.jsx'
import PeriodSelector from '../../components/routines/PeriodSelector.jsx'
import ProgressOverview from '../../components/routines/ProgressOverview.jsx'
import { getErrorMessage } from '../../utils/apiErrors.js'
import { GOAL_STATES } from '../../utils/constants.js'
import LoadingSkeleton from '../../components/common/LoadingSkeleton.jsx'

// Hoy como 'AAAA-MM-DD' (hora de la computadora)
const todayKey = () => {
  const now = new Date()
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}

// Mi progreso (routines.trackOwn): el resumen y los gráficos de las últimas 4, 8 o 12 semanas y los objetivos
// personales (crear, editar, cumplir, abandonar y reabrir). Avisa que la preparadora física también lo ve
export default function MyProgressPage() {
  const [weeks, setWeeks] = useState(8)
  const [progress, setProgress] = useState(null)
  const [goals, setGoals] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [dialog, setDialog] = useState(null)   // { mode, goal }
  const [busyId, setBusyId] = useState(null)
  const [notice, setNotice] = useState({ open: false, severity: 'success', message: '' })
  const closeNotice = () => setNotice((current) => ({ ...current, open: false }))

  const loadProgress = useCallback(() => {
    setLoading(true)
    getMyProgress(weeks)
      .then(({ data }) => { setProgress(data); setError('') })
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false))
  }, [weeks])

  const loadGoals = useCallback(() => {
    getMyGoals()
      .then(({ data }) => setGoals(data.items))
      .catch((err) => setError(getErrorMessage(err)))
  }, [])

  useEffect(() => { loadProgress() }, [loadProgress])
  useEffect(() => { loadGoals() }, [loadGoals])

  const afterGoalChange = (message) => {
    setNotice({ open: true, severity: 'success', message })
    loadGoals()
    loadProgress()
  }

  // Cerrar o reabrir. Reabrir uno con la fecha pasada abre el diálogo para elegir una nueva
  const handleAction = async (goal, action) => {
    if (action === 'edit') return setDialog({ mode: 'edit', goal })
    if (action === 'reopen' && goal.dueDate < todayKey()) return setDialog({ mode: 'reopen', goal })

    const goalState = { achieve: GOAL_STATES.ACHIEVED, abandon: GOAL_STATES.ABANDONED, reopen: GOAL_STATES.IN_PROGRESS }[action]
    setBusyId(goal.id)
    try {
      await setGoalState(goal.id, { goalState })
      afterGoalChange({ achieve: '¡Bien ahí! Marcaste el objetivo como cumplido.', abandon: 'Abandonaste el objetivo.', reopen: 'Reabriste el objetivo.' }[action])
    } catch (err) {
      setNotice({ open: true, severity: 'error', message: getErrorMessage(err) })
    } finally {
      setBusyId(null)
    }
  }

  const handleSubmit = async ({ text, dueDate }) => {
    try {
      if (dialog.mode === 'create') await createGoal({ text, dueDate })
      else if (dialog.mode === 'edit') await updateGoal(dialog.goal.id, { text, dueDate })
      else await setGoalState(dialog.goal.id, { goalState: GOAL_STATES.IN_PROGRESS, dueDate })
    } catch (err) {
      throw new Error(getErrorMessage(err))
    }
    const messages = { create: 'Sumaste un objetivo.', edit: 'Guardamos el objetivo.', reopen: 'Reabriste el objetivo.' }
    setDialog(null)
    afterGoalChange(messages[dialog.mode])
  }

  const noData = progress && progress.totals.scheduled === 0 && goals?.length === 0

  return (
    <>
      <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ justifyContent: 'space-between', alignItems: { sm: 'flex-end' }, gap: 2, mb: 3 }}>
        <Box>
          <Typography variant="h5" component="h2" sx={{ color: 'navy.main' }}>Mi progreso</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>Cómo te fue con las rutinas y tus objetivos personales.</Typography>
          <Stack direction="row" sx={{ alignItems: 'center', gap: 0.5, mt: 0.5, color: 'text.secondary' }}>
            <LockOutlined sx={{ fontSize: 14 }} />
            <Typography variant="caption">Tu preparadora física puede ver tus registros y tus objetivos.</Typography>
          </Stack>
        </Box>
        <PeriodSelector value={weeks} onChange={setWeeks} disabled={loading} />
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {!progress && loading && <LoadingSkeleton />}

      {noData && (
        <EmptyState
          icon={InsightsRounded}
          title="Todavía no hay datos"
          description="Cuando registres cómo te fue con tus rutinas, acá vas a ver tu progreso. También podés sumar un objetivo."
          action={<Button variant="contained" color="secondary" startIcon={<AddRounded />} onClick={() => setDialog({ mode: 'create', goal: null })}>Nuevo objetivo</Button>}
        />
      )}

      {progress && !noData && (
        <Stack spacing={3} sx={{ opacity: loading ? 0.6 : 1 }}>
          <ProgressOverview progress={progress} weeks={weeks} />

          <Card>
            <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
              <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', gap: 2, mb: 1, flexWrap: 'wrap' }}>
                <Typography variant="h6" component="h3" sx={{ color: 'navy.main' }}>Mis objetivos</Typography>
                <Button variant="contained" color="secondary" startIcon={<AddRounded />} onClick={() => setDialog({ mode: 'create', goal: null })}>Nuevo objetivo</Button>
              </Stack>
              {goals ? <GoalsList goals={goals} onAction={handleAction} busyId={busyId} /> : <CircularProgress color="secondary" size={24} />}
            </CardContent>
          </Card>
        </Stack>
      )}

      <GoalDialog open={Boolean(dialog)} mode={dialog?.mode ?? 'create'} goal={dialog?.goal} onClose={() => setDialog(null)} onSubmit={handleSubmit} />

      <Snackbar open={notice.open} autoHideDuration={5000} onClose={closeNotice} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={notice.severity} variant="filled" onClose={closeNotice}>{notice.message}</Alert>
      </Snackbar>
    </>
  )
}
