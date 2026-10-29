import { useEffect, useState } from 'react'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import ListItemText from '@mui/material/ListItemText'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'

import { createLeague, updateLeague } from '../../api/leagues.api.js'
import { getErrorMessage, getFieldErrors } from '../../utils/apiErrors.js'
import { AGE_SCALE_LABELS, AGE_SCALES } from '../../utils/constants.js'

const SCALES = Object.keys(AGE_SCALES).map(Number)
const groupsText = (scale) => AGE_SCALES[scale].map((group) => group.label).join(', ')

// Alta y edición de una liga. league: la liga a editar (sin league, es un alta). sports: los deportes del alcance.
// El deporte no se cambia al editar, y la escala queda fija si la liga ya tiene categorías.
export default function LeagueFormDialog({ open, league, sports, onClose, onSaved }) {
  const isEdit = Boolean(league)

  const [form, setForm] = useState({ name: '', clubSportId: '', ageScale: 1 })
  const [errors, setErrors] = useState({})
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setErrors({})
    setError('')
    setForm(league
      ? { name: league.name, clubSportId: league.clubSport.id, ageScale: league.ageScale }
      : { name: '', clubSportId: sports.length === 1 ? sports[0].id : '', ageScale: 1 })   // Con un solo deporte, ya elegido
  }, [open, league, sports])

  const setField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSaving(true)

    try {
      const { data } = isEdit
        ? await updateLeague(league.id, { name: form.name, ageScale: form.ageScale })
        : await createLeague(form)
      onSaved(data, isEdit ? 'Guardamos los cambios de la liga.' : `Creamos la liga ${data.name}.`)
    } catch (err) {
      setErrors(getFieldErrors(err))
      setError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const scaleLocked = isEdit && league.hasCategories
  const sportOptions = isEdit ? [league.clubSport] : sports

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="sm">
      <form onSubmit={handleSubmit} noValidate>
        <DialogTitle>{isEdit ? 'Editar liga' : 'Nueva liga'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}
            {!isEdit && sports.length === 0 && (
              <Alert severity="warning">No hay deportes activos para crear ligas. El Admin los activa en "Deportes del club".</Alert>
            )}

            <TextField
              label="Nombre"
              value={form.name}
              onChange={(event) => setField('name', event.target.value)}
              error={Boolean(errors.name)}
              helperText={errors.name ?? 'Por ejemplo, Liga Metropolitana.'}
              required
              fullWidth
              autoFocus
              slotProps={{ htmlInput: { maxLength: 100 } }}
            />

            <TextField
              select
              label="Deporte"
              value={form.clubSportId}
              onChange={(event) => setField('clubSportId', event.target.value)}
              error={Boolean(errors.clubSportId)}
              helperText={errors.clubSportId ?? (isEdit ? 'El deporte de una liga no se cambia.' : undefined)}
              disabled={isEdit}
              required
              fullWidth
            >
              {sportOptions.map((sport) => <MenuItem key={sport.id} value={sport.id}>{sport.name}</MenuItem>)}
            </TextField>

            <TextField
              select
              label="Escala de edad"
              value={form.ageScale}
              onChange={(event) => setField('ageScale', Number(event.target.value))}
              error={Boolean(errors.ageScale)}
              helperText={errors.ageScale ?? (scaleLocked ? 'La liga ya tiene categorías: la escala no se cambia.' : 'Las categorías de la liga se eligen de esta lista.')}
              disabled={scaleLocked}
              required
              fullWidth
              slotProps={{ select: { renderValue: (value) => AGE_SCALE_LABELS[value] } }}
            >
              {SCALES.map((scale) => (
                <MenuItem key={scale} value={scale}>
                  <ListItemText primary={AGE_SCALE_LABELS[scale]} secondary={groupsText(scale)} />
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button color="secondary" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button type="submit" variant="contained" color="secondary" loading={saving}>
            {isEdit ? 'Guardar cambios' : 'Crear liga'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}
