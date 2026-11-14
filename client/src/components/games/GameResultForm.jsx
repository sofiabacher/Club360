import { useEffect, useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Collapse from '@mui/material/Collapse'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import ExpandLessRounded from '@mui/icons-material/ExpandLessRounded'
import ExpandMoreRounded from '@mui/icons-material/ExpandMoreRounded'

import { markGamePlayed, saveGameResult } from '../../api/games.api.js'
import useAuth from '../../hooks/useAuth.js'
import { getErrorMessage } from '../../utils/apiErrors.js'
import { formatGameDate } from '../../utils/format.js'
import { hasResult, isValidSetResult, setError, setOptions, setsMatchError, setWinner } from '../../utils/results.js'

const emptySet = () => ({ own: '', rival: '' })

// Estado inicial: el resultado que ya tiene el partido (al corregirlo) o vacío
function initialState(game) {
  if (!game || !hasResult(game)) return { own: '', rival: '', showPoints: false, sets: [] }
  const sets = (game.setScores ?? []).map((set) => ({ own: String(set.own), rival: String(set.rival) }))
  return { own: game.ownScore, rival: game.rivalScore, showPoints: sets.length > 0, sets }
}

// Selector grande de los sets de un equipo (variante numeric). options: los valores posibles según el otro lado
function SetsSelect({ label, value, options, onChange, disabled }) {
  return (
    <TextField
      select
      label={label}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      disabled={disabled}
      sx={{ width: 96 }}
      slotProps={{ select: { sx: (theme) => ({ ...theme.typography.numeric, fontSize: '2.2rem', textAlign: 'center', py: 1 }) } }}
    >
      {options.map((option) => <MenuItem key={option} value={option} sx={(theme) => ({ ...theme.typography.numeric, fontSize: '1.4rem' })}>{option}</MenuItem>)}
    </TextField>
  )
}

// Fila de los puntos de un set: en verde o rojo según quién lo ganó, con el error en vivo debajo
function SetRow({ number, set, onChange, disabled }) {
  const winner = setWinner(set)
  const error = setError(set, number)
  const field = (side, label) => (
    <TextField
      type="number"
      label={label}
      value={set[side]}
      onChange={(event) => onChange({ ...set, [side]: event.target.value })}
      size="small"
      disabled={disabled}
      sx={{ width: 96 }}
      slotProps={{ htmlInput: { min: 0, max: 99, inputMode: 'numeric' } }}
    />
  )

  return (
    <Box
      sx={(theme) => ({
        p: 1.25,
        borderRadius: 2,
        border: 1,
        borderColor: 'divider',
        bgcolor: winner === 'own' ? theme.status.ok.bg : winner === 'rival' ? theme.status.overdue.bg : 'transparent'
      })}
    >
      <Stack direction="row" sx={{ alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
        <Typography sx={{ fontWeight: 600, color: 'navy.main', minWidth: 48 }}>Set {number}</Typography>
        {field('own', 'Club')}
        <Typography sx={{ color: 'text.secondary' }}>–</Typography>
        {field('rival', 'Rival')}
        {winner && (
          <Typography variant="body2" sx={(theme) => ({ fontWeight: 600, color: winner === 'own' ? theme.status.ok.fg : theme.status.overdue.fg })}>
            {winner === 'own' ? 'Lo ganó el club' : 'Lo ganó el rival'}
          </Typography>
        )}
      </Stack>
      {error && <Typography variant="body2" sx={{ color: 'error.main', mt: 0.75 }}>{error}</Typography>}
    </Box>
  )
}

// Diálogo para cargar el resultado de un partido: al marcarlo como Jugado (mode 'played') o para cargarlo o corregirlo
// en uno ya Jugado (mode 'result'). Los sets solo admiten resultados de VALID_SET_RESULTS; los puntos de cada set son
// opcionales y se validan en vivo con la misma regla del backend. onSaved(game) al guardar
export default function GameResultForm({ open, game, mode = 'played', onClose, onSaved }) {
  const { club } = useAuth()
  const [form, setForm] = useState(() => initialState(game))
  const [saving, setSaving] = useState(false)
  const [error, setErrorMessage] = useState('')

  useEffect(() => {
    if (open) {
      setForm(initialState(mode === 'result' ? game : null))
      setErrorMessage('')
    }
  }, [open, game, mode])

  if (!game) return null

  const own = form.own === '' ? null : Number(form.own)
  const rival = form.rival === '' ? null : Number(form.rival)
  const validSets = own !== null && rival !== null && isValidSetResult(own, rival)
  const setCount = validSets ? own + rival : 0

  // Las filas de puntos siguen a la cantidad de sets jugados
  const sets = Array.from({ length: setCount }, (_, index) => form.sets[index] ?? emptySet())
  const pointsIncomplete = form.showPoints && sets.some((set) => set.own === '' || set.rival === '')
  const pointsErrors = form.showPoints && (sets.some((set, index) => setError(set, index + 1)) || Boolean(setsMatchError(sets, own, rival)))
  const matchError = form.showPoints && validSets ? setsMatchError(sets, own, rival) : ''
  const canSave = validSets && !pointsIncomplete && !pointsErrors

  // El lado del club ofrece todos los valores; si con el nuevo valor el del rival deja de ser válido, se vacía
  const setOwn = (value) => setForm((current) => ({
    ...current,
    own: value,
    rival: current.rival !== '' && !isValidSetResult(Number(value), Number(current.rival)) ? '' : current.rival
  }))
  const setRival = (value) => setForm((current) => ({ ...current, rival: value }))
  const setSet = (index) => (value) => setForm((current) => {
    const next = Array.from({ length: setCount }, (_, i) => current.sets[i] ?? emptySet())
    next[index] = value
    return { ...current, sets: next }
  })

  const handleSave = async () => {
    setSaving(true)
    setErrorMessage('')
    const payload = {
      ownScore: own,
      rivalScore: rival,
      setScores: form.showPoints ? sets.map((set) => ({ own: Number(set.own), rival: Number(set.rival) })) : null
    }
    try {
      const { data } = mode === 'played' ? await markGamePlayed(game.id, payload) : await saveGameResult(game.id, payload)
      onSaved(data.game)
    } catch (err) {
      setErrorMessage(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const title = mode === 'played' ? 'Marcar como jugado' : hasResult(game) ? 'Corregir el resultado' : 'Cargar el resultado'

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {game.category?.name} · {formatGameDate(game.dateTime)} · {game.isHome ? 'Local' : 'Visitante'}
        </Typography>

        <Typography variant="overline" component="p" sx={{ color: 'text.secondary', letterSpacing: 1.5, mt: 2 }}>Sets</Typography>
        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'center', gap: { xs: 1, sm: 2 }, flexWrap: 'wrap', py: 1 }}>
          <Typography sx={{ fontWeight: 600, color: 'navy.main', textAlign: 'right', flex: '1 1 0', minWidth: 80, overflowWrap: 'anywhere' }}>{club?.name}</Typography>
          <SetsSelect label="Club" value={form.own} options={setOptions(null)} onChange={setOwn} disabled={saving} />
          <Typography variant="numeric" sx={{ fontSize: '2rem', color: 'text.secondary' }}>–</Typography>
          <SetsSelect label="Rival" value={form.rival} options={form.own === '' ? [] : setOptions(form.own)} onChange={setRival} disabled={saving || form.own === ''} />
          <Typography sx={{ fontWeight: 600, color: 'navy.main', flex: '1 1 0', minWidth: 80, overflowWrap: 'anywhere' }}>{game.rival}</Typography>
        </Stack>
        <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center' }}>
          Al mejor de 5 (3-0, 3-1, 3-2) o al mejor de 3 (2-0, 2-1).
        </Typography>

        <Button
          color="secondary"
          onClick={() => setForm((current) => ({ ...current, showPoints: !current.showPoints }))}
          endIcon={form.showPoints ? <ExpandLessRounded /> : <ExpandMoreRounded />}
          disabled={!validSets || saving}
          sx={{ mt: 2 }}
        >
          {form.showPoints ? 'Quitar los puntos de cada set' : 'Agregar los puntos de cada set'}
        </Button>
        {!validSets && <Typography variant="caption" component="p" sx={{ color: 'text.secondary' }}>Elegí primero los sets.</Typography>}

        <Collapse in={form.showPoints && validSets}>
          <Stack spacing={1.25} sx={{ mt: 1.5 }}>
            {sets.map((set, index) => (
              <SetRow key={index} number={index + 1} set={set} onChange={setSet(index)} disabled={saving} />
            ))}
            {matchError && <Alert severity="warning">{matchError}</Alert>}
            {pointsIncomplete && <Typography variant="caption" sx={{ color: 'text.secondary' }}>Completá los puntos de todos los sets, o quitalos.</Typography>}
          </Stack>
        </Collapse>

        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button color="secondary" onClick={onClose} disabled={saving}>Cancelar</Button>
        <Button variant="contained" color="primary" onClick={handleSave} loading={saving} disabled={!canSave}>
          {mode === 'played' ? 'Marcar como jugado' : 'Guardar resultado'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
