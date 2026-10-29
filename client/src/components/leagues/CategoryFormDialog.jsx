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

import { createCategory, updateCategory } from '../../api/leagues.api.js'
import { getErrorMessage, getFieldErrors } from '../../utils/apiErrors.js'
import { AGE_SCALES } from '../../utils/constants.js'

// "Sub-18 · hasta 18 años en 2026" o "Mayores · todas las edades"
export const ageGroupText = (group, year) => (group.maxAge === null
  ? `${group.label} · todas las edades`
  : `${group.label} · hasta ${group.maxAge} años en ${year}`)

// Alta de una categoría en una liga (league) o edición de su nombre (category). El grupo de edad no se cambia.
export default function CategoryFormDialog({ open, league, category, year, onClose, onSaved }) {
  const isEdit = Boolean(category)
  const groups = league ? AGE_SCALES[league.ageScale] ?? [] : []

  const [form, setForm] = useState({ ageGroup: '', name: '' })
  const [errors, setErrors] = useState({})
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setErrors({})
    setError('')
    setForm(category ? { ageGroup: category.ageGroup, name: category.name } : { ageGroup: '', name: '' })
  }, [open, category])

  // Al elegir el grupo, el nombre se prellena con su etiqueta (si no se escribió otro)
  const handleGroupChange = (event) => {
    const code = event.target.value
    const previousLabel = groups.find((group) => group.code === form.ageGroup)?.label
    const label = groups.find((group) => group.code === code)?.label ?? ''

    setForm((current) => ({ ageGroup: code, name: !current.name || current.name === previousLabel ? label : current.name }))
    setErrors({})
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSaving(true)

    try {
      const { data } = isEdit
        ? await updateCategory(category.id, form.name)
        : await createCategory(league.id, form)
      onSaved(data, isEdit ? 'Guardamos el nombre de la categoría.' : `Creamos la categoría ${data.name}.`)
    } catch (err) {
      setErrors(getFieldErrors(err))
      setError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="xs">
      <form onSubmit={handleSubmit} noValidate>
        <DialogTitle>{isEdit ? 'Editar categoría' : `Nueva categoría en ${league?.name ?? ''}`}</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}

            {!isEdit && (
              <TextField
                select
                label="Grupo de edad"
                value={form.ageGroup}
                onChange={handleGroupChange}
                error={Boolean(errors.ageGroup)}
                helperText={errors.ageGroup ?? 'Una jugadora más chica puede jugar en una categoría superior.'}
                required
                fullWidth
              >
                {groups.map((group) => <MenuItem key={group.code} value={group.code}>{ageGroupText(group, year)}</MenuItem>)}
              </TextField>
            )}

            <TextField
              label="Nombre"
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              error={Boolean(errors.name)}
              helperText={errors.name ?? 'Si hay dos del mismo grupo, por ejemplo Sub-18 A y Sub-18 B.'}
              required={isEdit}
              fullWidth
              autoFocus={isEdit}
              slotProps={{ htmlInput: { maxLength: 100 } }}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button color="secondary" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button type="submit" variant="contained" color="secondary" loading={saving} disabled={!isEdit && !form.ageGroup}>
            {isEdit ? 'Guardar' : 'Crear categoría'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}
