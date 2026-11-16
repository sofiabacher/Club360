import { useEffect, useState } from 'react'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import { createCategory, updateCategory } from '../../api/leagues.api.js'
import { ageGroupText, ageRangeText, customAgeLabel } from '../../utils/ageGroups.js'
import { getErrorMessage, getFieldErrors } from '../../utils/apiErrors.js'
import { AGE_SCALE_CUSTOM, AGE_SCALES, CUSTOM_AGE_LIMITS } from '../../utils/constants.js'

const EMPTY_FORM = { ageGroup: '', name: '', minAge: '', maxAge: '' }

// Edad escrita → número o null (vacía = sin límite)
const ageValue = (value) => (value === '' ? null : Number(value))

// Ayuda del grupo de edad según la escala: las Sub-N van por edad máxima y las Maxi por edad mínima
const groupHelp = (groups) => (groups.some((group) => group.minAge)
  ? 'Una jugadora más grande puede jugar en una categoría menor.'
  : 'Una jugadora más chica puede jugar en una categoría superior.')

// Alta de una categoría en una liga (league) o edición de su nombre (category). El grupo de edad no se cambia.
// En una liga con escala personalizada, en lugar del grupo se cargan el nombre (obligatorio) y la edad mínima y/o máxima
export default function CategoryFormDialog({ open, league, category, year, onClose, onSaved }) {
  const isEdit = Boolean(category)
  const isCustom = league?.ageScale === AGE_SCALE_CUSTOM
  const groups = league ? AGE_SCALES[league.ageScale] ?? [] : []

  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setErrors({})
    setError('')
    setForm(category ? { ...EMPTY_FORM, ageGroup: category.ageGroup, name: category.name } : EMPTY_FORM)
  }, [open, category])

  const setField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
  }

  // Al elegir el grupo, el nombre se prellena con su etiqueta (si no se escribió otro)
  const handleGroupChange = (event) => {
    const code = event.target.value
    const previousLabel = groups.find((group) => group.code === form.ageGroup)?.label
    const label = groups.find((group) => group.code === code)?.label ?? ''

    setForm((current) => ({ ...current, ageGroup: code, name: !current.name || current.name === previousLabel ? label : current.name }))
    setErrors({})
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSaving(true)

    const payload = isCustom
      ? { name: form.name, minAge: ageValue(form.minAge), maxAge: ageValue(form.maxAge) }
      : { ageGroup: form.ageGroup, name: form.name }

    try {
      const { data } = isEdit
        ? await updateCategory(category.id, form.name)
        : await createCategory(league.id, payload)
      onSaved(data, isEdit ? 'Guardamos el nombre de la categoría.' : `Creamos la categoría ${data.name}.`)
    } catch (err) {
      setErrors(getFieldErrors(err))
      setError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const customGroup = { minAge: form.minAge, maxAge: form.maxAge }
  const canSubmit = isEdit || (isCustom ? form.name.trim() !== '' : Boolean(form.ageGroup))

  const ageField = (field, label) => (
    <TextField
      label={label}
      type="number"
      value={form[field]}
      onChange={(event) => setField(field, event.target.value)}
      error={Boolean(errors[field])}
      helperText={errors[field] ?? 'Vacía: sin límite'}
      fullWidth
      slotProps={{ htmlInput: { min: CUSTOM_AGE_LIMITS.min, max: CUSTOM_AGE_LIMITS.max, inputMode: 'numeric' } }}
    />
  )

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="xs">
      <form onSubmit={handleSubmit} noValidate>
        <DialogTitle>{isEdit ? 'Editar categoría' : `Nueva categoría en ${league?.name ?? ''}`}</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}

            {!isEdit && !isCustom && (
              <TextField
                select
                label="Grupo de edad"
                value={form.ageGroup}
                onChange={handleGroupChange}
                error={Boolean(errors.ageGroup)}
                helperText={errors.ageGroup ?? groupHelp(groups)}
                required
                fullWidth
              >
                {groups.map((group) => <MenuItem key={group.code} value={group.code}>{ageGroupText(group, year)}</MenuItem>)}
              </TextField>
            )}

            <TextField
              label="Nombre"
              value={form.name}
              onChange={(event) => setField('name', event.target.value)}
              error={Boolean(errors.name)}
              helperText={errors.name ?? (isCustom && !isEdit
                ? 'Por ejemplo, Veteranas +50 o Recreativo.'
                : 'Si hay dos del mismo grupo, por ejemplo Sub-18 A y Sub-18 B.')}
              required={isEdit || isCustom}
              fullWidth
              autoFocus={isEdit || isCustom}
              slotProps={{ htmlInput: { maxLength: 100 } }}
            />

            {!isEdit && isCustom && (
              <>
                <Stack direction="row" spacing={2}>
                  {ageField('minAge', 'Edad mínima')}
                  {ageField('maxAge', 'Edad máxima')}
                </Stack>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Grupo <strong>{customAgeLabel(customGroup.minAge, customGroup.maxAge)}</strong>: {ageRangeText(customGroup, year)}.
                  La edad es la de temporada (año actual menos año de nacimiento).
                </Typography>
              </>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button color="secondary" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button type="submit" variant="contained" color="secondary" loading={saving} disabled={!canSubmit}>
            {isEdit ? 'Guardar' : 'Crear categoría'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}
