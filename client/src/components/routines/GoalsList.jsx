import { useEffect, useState } from 'react'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import StatusChip from '../common/StatusChip.jsx'
import { GOAL_STATES } from '../../utils/constants.js'
import { formatDate } from '../../utils/format.js'
import { goalChip } from '../../utils/tracking.js'

// Hoy como 'AAAA-MM-DD' (hora de la computadora), para el mínimo de la fecha límite
const todayKey = () => {
  const now = new Date()
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}

// Diálogo de un objetivo. mode: 'create' (texto y fecha), 'edit' (texto y fecha de uno En curso) o 'reopen' (solo la
// fecha nueva, para reabrir uno con la fecha pasada). onSubmit({ text, dueDate }) devuelve una promesa
export function GoalDialog({ open, mode, goal, onClose, onSubmit }) {
  const [text, setText] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setText(mode === 'create' ? '' : goal?.text ?? '')
    setDueDate(mode === 'edit' ? goal?.dueDate ?? '' : '')
    setError('')
  }, [open, mode, goal])

  const textOk = mode === 'reopen' || (text.trim().length >= 5 && text.trim().length <= 200)
  const dateOk = Boolean(dueDate) && dueDate >= todayKey()

  const handleSubmit = async () => {
    setSaving(true)
    setError('')
    try {
      await onSubmit({ text: text.trim(), dueDate })
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const titles = { create: 'Nuevo objetivo', edit: 'Editar el objetivo', reopen: 'Reabrir el objetivo' }

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="xs">
      <DialogTitle>{titles[mode]}</DialogTitle>
      <DialogContent>
        {mode === 'reopen' ? (
          <DialogContentText sx={{ mb: 2 }}>“{goal?.text}”. Su fecha límite ya pasó: elegí una nueva.</DialogContentText>
        ) : (
          <TextField
            label="Objetivo"
            value={text}
            onChange={(event) => setText(event.target.value)}
            multiline
            minRows={2}
            fullWidth
            autoFocus
            disabled={saving}
            sx={{ mt: 1, mb: 2 }}
            slotProps={{ htmlInput: { maxLength: 200 } }}
            helperText={`De 5 a 200 caracteres (${text.trim().length}/200)`}
          />
        )}
        <TextField
          type="date"
          label="Fecha límite"
          value={dueDate}
          onChange={(event) => setDueDate(event.target.value)}
          fullWidth
          disabled={saving}
          slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: todayKey() } }}
          helperText="De hoy en adelante."
        />
        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button color="secondary" onClick={onClose} disabled={saving}>Cancelar</Button>
        <Button variant="contained" color="secondary" onClick={handleSubmit} loading={saving} disabled={!textOk || !dateOk}>Guardar</Button>
      </DialogActions>
    </Dialog>
  )
}

// Lista de objetivos (primero los En curso por fecha, después los cerrados): el texto, la fecha límite y su chip.
// Sin onAction es de solo lectura (vista de la preparadora). onAction(goal, action): 'achieve', 'abandon', 'edit' o 'reopen'
export default function GoalsList({ goals, onAction, busyId }) {
  if (goals.length === 0) {
    return <Typography variant="body2" sx={{ color: 'text.secondary' }}>Todavía no hay objetivos.</Typography>
  }

  return (
    <Stack divider={<Divider flexItem />}>
      {goals.map((goal) => {
        const chip = goalChip(goal)
        const open = goal.goalState === GOAL_STATES.IN_PROGRESS
        const busy = busyId === goal.id

        return (
          <Stack key={goal.id} direction={{ xs: 'column', sm: 'row' }} sx={{ py: 1.5, gap: 1, alignItems: { sm: 'center' } }}>
            <Stack sx={{ flexGrow: 1, minWidth: 0 }}>
              <Typography sx={{ fontWeight: 600, color: 'navy.main', overflowWrap: 'anywhere' }}>{goal.text}</Typography>
              <Stack direction="row" sx={{ gap: 1, alignItems: 'center', flexWrap: 'wrap', mt: 0.5 }}>
                <StatusChip status={chip.status} label={chip.label} />
                <Typography variant="body2" sx={{ color: goal.overdue ? 'error.main' : 'text.secondary' }}>
                  {open ? `Hasta el ${formatDate(goal.dueDate)}` : `${chip.label} el ${formatDate(goal.closedAt)}`}
                </Typography>
              </Stack>
            </Stack>

            {onAction && (
              <Stack direction="row" sx={{ gap: 0.5, flexWrap: 'wrap', flexShrink: 0 }}>
                {open ? (
                  <>
                    <Button size="small" color="secondary" onClick={() => onAction(goal, 'achieve')} disabled={busy}>Cumplido</Button>
                    <Button size="small" color="secondary" onClick={() => onAction(goal, 'abandon')} disabled={busy}>Abandonar</Button>
                    <Button size="small" color="secondary" onClick={() => onAction(goal, 'edit')} disabled={busy}>Editar</Button>
                  </>
                ) : (
                  <Button size="small" color="secondary" onClick={() => onAction(goal, 'reopen')} disabled={busy}>Reabrir</Button>
                )}
              </Stack>
            )}
          </Stack>
        )
      })}
    </Stack>
  )
}
