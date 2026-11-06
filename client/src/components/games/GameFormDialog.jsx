import { useEffect, useState } from 'react'
import { isValid, parseISO } from 'date-fns'
import Alert from '@mui/material/Alert'
import AlertTitle from '@mui/material/AlertTitle'
import Button from '@mui/material/Button'
import Collapse from '@mui/material/Collapse'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useTheme } from '@mui/material/styles'
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker'

import { checkConflicts, createGame, updateGame } from '../../api/games.api.js'
import { getErrorMessage, getFieldErrors } from '../../utils/apiErrors.js'
import { gameSummary, gapText, otherGameOf } from '../../utils/games.js'

const emptyForm = { categoryId: '', rival: '', dateTime: null, isHome: true, address: '' }

// Alta y edición de un partido (pantalla completa en el celular). Al cambiar la categoría o la fecha y hora, pide
// check-conflicts y muestra en vivo las jugadoras que tendrían partidos superpuestos. No bloquea: el botón dice
// "Guardar igual". game: el partido a editar (sin game, es un alta). options: { categories, courts }
export default function GameFormDialog({ open, game, options, onClose, onSaved }) {
  const theme = useTheme()
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'))
  const isEdit = Boolean(game)

  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState({})
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [conflicts, setConflicts] = useState([])
  const [showConflicts, setShowConflicts] = useState(false)

  useEffect(() => {
    if (!open) return
    setErrors({})
    setError('')
    setConflicts([])
    setShowConflicts(false)
    setForm(game
      ? { categoryId: game.categoryId, rival: game.rival, dateTime: parseISO(game.dateTime), isHome: game.isHome, address: game.address }
      : { ...emptyForm, address: options.courts[0]?.label ?? '' })
  }, [open, game, options])

  // Aviso en vivo de superposiciones
  const dateKey = isValid(form.dateTime) ? form.dateTime.toISOString() : ''
  useEffect(() => {
    if (!open || !form.categoryId || !dateKey) {
      setConflicts([])
      return undefined
    }

    const timer = setTimeout(() => {
      checkConflicts({ categoryId: form.categoryId, dateTime: dateKey, gameId: game?.id })
        .then(({ data }) => setConflicts(data.conflicts))
        .catch(() => setConflicts([]))
    }, 400)

    return () => clearTimeout(timer)
  }, [open, form.categoryId, dateKey, game])

  const setField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
  }

  // Al pasar de local a visitante se escribe la dirección; de visitante a local, se elige una cancha
  const changeHome = (event, value) => {
    if (value === null) return
    setForm((current) => ({ ...current, isHome: value, address: value ? (options.courts[0]?.label ?? '') : '' }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    if (!isValid(form.dateTime)) {
      setErrors({ dateTime: 'Ingresá la fecha y la hora.' })
      return
    }

    const payload = { rival: form.rival, dateTime: form.dateTime.toISOString(), isHome: form.isHome, address: form.address }
    setSaving(true)

    try {
      const { data } = isEdit ? await updateGame(game.id, payload) : await createGame({ ...payload, categoryId: form.categoryId })
      onSaved(data)
    } catch (err) {
      setErrors(getFieldErrors(err))
      setError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  // Si la dirección guardada ya no es una cancha del club (el Admin las cambió), igual se muestra
  const courtOptions = options.courts.map((court) => court.label)
  if (form.isHome && form.address && !courtOptions.includes(form.address)) courtOptions.unshift(form.address)

  const players = new Set(conflicts.map((conflict) => conflict.member.id)).size

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} fullScreen={fullScreen} fullWidth maxWidth="sm">
      <form onSubmit={handleSubmit} noValidate>
        <DialogTitle>{isEdit ? 'Editar partido' : 'Nuevo partido'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}

            {isEdit ? (
              <TextField label="Categoría" value={`${game.category?.name} · ${game.league?.name}`} disabled fullWidth helperText="La categoría de un partido no se cambia." />
            ) : (
              <TextField
                select
                label="Categoría"
                value={form.categoryId}
                onChange={(event) => setField('categoryId', event.target.value)}
                error={Boolean(errors.categoryId)}
                helperText={errors.categoryId ?? (options.categories.length === 0 ? 'No hay categorías activas: creálas en Ligas y categorías.' : undefined)}
                required
                fullWidth
              >
                {options.categories.map((category) => (
                  <MenuItem key={category.id} value={category.id}>{category.name} · {category.league.name}</MenuItem>
                ))}
              </TextField>
            )}

            <TextField
              label="Rival"
              value={form.rival}
              onChange={(event) => setField('rival', event.target.value)}
              error={Boolean(errors.rival)}
              helperText={errors.rival}
              required
              fullWidth
              slotProps={{ htmlInput: { maxLength: 100 } }}
            />

            <DateTimePicker
              label="Fecha y hora"
              value={form.dateTime}
              onChange={(value) => setField('dateTime', value)}
              disablePast
              ampm={false}
              slotProps={{ textField: { required: true, fullWidth: true, error: Boolean(errors.dateTime), helperText: errors.dateTime } }}
            />

            <ToggleButtonGroup value={form.isHome} exclusive onChange={changeHome} color="secondary" fullWidth size="small">
              <ToggleButton value>Local</ToggleButton>
              <ToggleButton value={false}>Visitante</ToggleButton>
            </ToggleButtonGroup>

            {form.isHome ? (
              <TextField
                select
                label="Cancha del club"
                value={form.address}
                onChange={(event) => setField('address', event.target.value)}
                error={Boolean(errors.address)}
                helperText={errors.address ?? (courtOptions.length === 0 ? 'El club no tiene canchas cargadas: el Admin las agrega en la configuración del club.' : undefined)}
                required
                fullWidth
              >
                {courtOptions.map((label) => <MenuItem key={label} value={label}>{label}</MenuItem>)}
              </TextField>
            ) : (
              <TextField
                label="Dirección"
                value={form.address}
                onChange={(event) => setField('address', event.target.value)}
                error={Boolean(errors.address)}
                helperText={errors.address ?? 'La cancha del rival: club, calle y número.'}
                required
                fullWidth
                slotProps={{ htmlInput: { maxLength: 200 } }}
              />
            )}

            {conflicts.length > 0 && (
              <Alert
                severity="warning"
                sx={(themeArg) => ({ bgcolor: themeArg.status.urgent.bg, color: themeArg.status.urgent.fg, '& .MuiAlert-icon': { color: themeArg.status.urgent.fg } })}
                action={(
                  <Button color="inherit" size="small" onClick={() => setShowConflicts((current) => !current)}>
                    {showConflicts ? 'Ocultar' : 'Ver'}
                  </Button>
                )}
              >
                <AlertTitle sx={{ mb: 0 }}>
                  Ojo: {players} {players === 1 ? 'jugadora tendría' : 'jugadoras tendrían'} partidos superpuestos
                </AlertTitle>
                <Collapse in={showConflicts}>
                  <List dense disablePadding sx={{ mt: 1 }}>
                    {conflicts.map((conflict) => (
                      <ListItem key={`${conflict.member.id}-${otherGameOf(conflict, game?.id).id}`} disableGutters>
                        <ListItemText
                          primary={conflict.member.name}
                          secondary={`${gameSummary(otherGameOf(conflict, game?.id))}: ${gapText(conflict, game?.id)}`}
                          slotProps={{ primary: { sx: { fontWeight: 600 } }, secondary: { sx: { color: 'inherit' } } }}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Collapse>
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button color="secondary" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button type="submit" variant="contained" color="secondary" loading={saving}>
            {conflicts.length > 0 ? 'Guardar igual' : 'Guardar'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}
