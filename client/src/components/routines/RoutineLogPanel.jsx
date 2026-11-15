import { useEffect, useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import ButtonBase from '@mui/material/ButtonBase'
import Divider from '@mui/material/Divider'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import StatusChip from '../common/StatusChip.jsx'
import { saveRoutineLog } from '../../api/routines.api.js'
import { getErrorMessage } from '../../utils/apiErrors.js'
import { ROUTINE_LOG_STATUS } from '../../utils/constants.js'
import { EFFORT_LABELS, LOG_STATUS_INFO, needsEffort } from '../../utils/tracking.js'

const STATUSES = [ROUTINE_LOG_STATUS.COMPLETED, ROUTINE_LOG_STATUS.PARTIAL, ROUTINE_LOG_STATUS.NOT_COMPLETED]

// Esfuerzo percibido: cinco círculos del 1 al 5, con etiquetas en los extremos. Sin onChange, solo para ver
export function EffortCircles({ value, onChange, disabled = false, size = 40 }) {
  return (
    <Box>
      <Stack direction="row" sx={{ gap: 1 }} role={onChange ? 'radiogroup' : undefined} aria-label="Esfuerzo, del 1 al 5">
        {[1, 2, 3, 4, 5].map((number) => {
          const selected = number === value
          return (
            <ButtonBase
              key={number}
              component={onChange ? 'button' : 'div'}
              disabled={disabled || !onChange}
              onClick={onChange ? () => onChange(number) : undefined}
              role={onChange ? 'radio' : undefined}
              aria-checked={onChange ? selected : undefined}
              aria-label={`Esfuerzo ${number}${EFFORT_LABELS[number] ? ` (${EFFORT_LABELS[number]})` : ''}`}
              focusRipple
              sx={(theme) => ({
                width: size,
                height: size,
                borderRadius: '50%',
                border: 2,
                borderColor: selected ? 'secondary.main' : 'divider',
                bgcolor: selected ? 'secondary.main' : 'background.paper',
                color: selected ? 'secondary.contrastText' : 'navy.main',
                ...theme.typography.numeric,
                fontSize: size * 0.45,
                '&.Mui-disabled': { color: selected ? 'secondary.contrastText' : 'navy.main' }
              })}
            >
              {number}
            </ButtonBase>
          )
        })}
      </Stack>
      <Stack direction="row" sx={{ justifyContent: 'space-between', width: size * 5 + 32, mt: 0.5 }}>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>{EFFORT_LABELS[1]}</Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>{EFFORT_LABELS[5]}</Typography>
      </Stack>
    </Box>
  )
}

// Botón grande de un estado (Completada verde, Parcial ámbar, No la hice rojo), con los colores de theme.status
function StatusButton({ status, selected, onClick, disabled }) {
  const info = LOG_STATUS_INFO[status]
  return (
    <ButtonBase
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      focusRipple
      sx={(theme) => ({
        flex: '1 1 0',
        minWidth: 96,
        py: 1.5,
        px: 1,
        borderRadius: 2,
        border: 2,
        borderColor: selected ? theme.status[info.status].fg : 'divider',
        bgcolor: selected ? theme.status[info.status].bg : 'background.paper',
        color: theme.status[info.status].fg,
        fontWeight: 700,
        fontSize: '0.95rem',
        gap: 0.75
      })}
    >
      <span aria-hidden="true">{info.symbol}</span> {info.button}
    </ButtonBase>
  )
}

// Registro de la rutina de un día en "Mi rutina": "¿Cómo te fue?" con los tres estados, el esfuerzo (si la hizo), la nota
// y "Guardar" (naranja). Si ya la registró, lo que puso y "Editar" mientras esté dentro de la ventana; fuera de la
// ventana, solo lectura o "No registrada". onSaved(log) al guardar
export default function RoutineLogPanel({ routine, onSaved }) {
  const log = routine.myLog
  const [editing, setEditing] = useState(!log && routine.canLog)
  const [form, setForm] = useState({ status: log?.status ?? null, effort: log?.effort ?? null, note: log?.note ?? '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setEditing(!routine.myLog && routine.canLog)
    setForm({ status: routine.myLog?.status ?? null, effort: routine.myLog?.effort ?? null, note: routine.myLog?.note ?? '' })
    setError('')
  }, [routine])

  const canSave = form.status && (!needsEffort(form.status) || form.effort)

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      const { data } = await saveRoutineLog(routine.id, {
        status: form.status,
        effort: needsEffort(form.status) ? form.effort : null,
        note: form.note.trim() || null
      })
      setEditing(false)
      onSaved(data.log)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const header = <Typography variant="overline" component="h4" sx={{ color: 'text.secondary', letterSpacing: 1.5 }}>¿Cómo te fue?</Typography>

  if (!editing) {
    if (!log) {
      return (
        <Box>
          <Divider sx={{ my: 2 }} />
          {header}
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>{routine.canLog ? 'Todavía no la registraste.' : 'No registrada.'}</Typography>
        </Box>
      )
    }

    const info = LOG_STATUS_INFO[log.status]
    return (
      <Box>
        <Divider sx={{ my: 2 }} />
        {header}
        <Stack direction="row" sx={{ alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
          <StatusChip status={info.status} label={log.status === ROUTINE_LOG_STATUS.NOT_COMPLETED ? 'No la hice' : info.label} />
          {log.effort && <Typography variant="body2" sx={{ color: 'navy.main' }}>Esfuerzo <Typography component="span" variant="numeric" sx={{ fontSize: '1.1rem' }}>{log.effort}</Typography> de 5</Typography>}
          {routine.canLog && <Button size="small" color="secondary" onClick={() => setEditing(true)}>Editar</Button>}
        </Stack>
        {log.note && <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1, whiteSpace: 'pre-line', overflowWrap: 'anywhere' }}>“{log.note}”</Typography>}
      </Box>
    )
  }

  return (
    <Box>
      <Divider sx={{ my: 2 }} />
      {header}
      <Stack direction="row" sx={{ gap: 1, flexWrap: 'wrap', mt: 0.5 }}>
        {STATUSES.map((status) => (
          <StatusButton
            key={status}
            status={status}
            selected={form.status === status}
            disabled={saving}
            onClick={() => setForm((current) => ({ ...current, status, effort: needsEffort(status) ? current.effort : null }))}
          />
        ))}
      </Stack>

      {needsEffort(form.status) && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" sx={{ fontWeight: 600, color: 'navy.main', mb: 1 }}>¿Cuánto esfuerzo te pidió?</Typography>
          <EffortCircles value={form.effort} onChange={(effort) => setForm((current) => ({ ...current, effort }))} disabled={saving} />
        </Box>
      )}

      <TextField
        label="Nota (opcional)"
        value={form.note}
        onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))}
        multiline
        minRows={2}
        fullWidth
        disabled={saving}
        sx={{ mt: 2 }}
        slotProps={{ htmlInput: { maxLength: 300 } }}
        helperText={`${form.note.length}/300`}
      />

      {error && <Alert severity="error" sx={{ mt: 1.5 }}>{error}</Alert>}

      <Stack direction="row" sx={{ gap: 1.5, mt: 1.5, justifyContent: 'flex-end' }}>
        {log && <Button color="secondary" onClick={() => setEditing(false)} disabled={saving}>Cancelar</Button>}
        <Button variant="contained" color="primary" onClick={handleSave} loading={saving} disabled={!canSave}>Guardar</Button>
      </Stack>
    </Box>
  )
}
