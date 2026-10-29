import { useEffect, useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Checkbox from '@mui/material/Checkbox'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import { assignStaff, getEligibleStaff } from '../../api/leagues.api.js'
import { getErrorMessage } from '../../utils/apiErrors.js'

// Agregar staff a una categoría: entrenadoras y preparadoras físicas activas del deporte que todavía no están
export default function AddStaffDialog({ open, category, onClose, onSaved }) {
  const [staff, setStaff] = useState(null)
  const [selected, setSelected] = useState([])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setStaff(null)
    setSelected([])
    setError('')

    getEligibleStaff(category.id)
      .then(({ data }) => setStaff(data.staff))
      .catch((err) => setError(getErrorMessage(err)))
  }, [open, category.id])

  const toggle = (staffId) => setSelected((current) => (
    current.includes(staffId) ? current.filter((id) => id !== staffId) : [...current, staffId]
  ))

  const handleSave = async () => {
    setError('')
    setSaving(true)

    try {
      const { data } = await assignStaff(category.id, selected)
      onSaved(data, selected.length === 1 ? 'Agregamos a la persona del staff.' : `Agregamos ${selected.length} personas del staff.`)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>Agregar staff a {category.name}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
          Entrenadoras y preparadoras físicas de {category.sport.name}.
        </Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {!staff && !error && (
          <Box sx={{ display: 'grid', placeItems: 'center', py: 4 }}>
            <CircularProgress color="secondary" />
          </Box>
        )}

        {staff && staff.length === 0 && (
          <Typography variant="body2" sx={{ color: 'text.secondary', py: 3, textAlign: 'center' }}>
            No hay más staff de {category.sport.name} para agregar.
          </Typography>
        )}

        {staff && staff.length > 0 && (
          <List dense>
            {staff.map((person) => (
              <ListItemButton key={person.staffId} onClick={() => toggle(person.staffId)} sx={{ borderRadius: 2 }}>
                <ListItemIcon sx={{ minWidth: 40 }}>
                  <Checkbox edge="start" checked={selected.includes(person.staffId)} tabIndex={-1} disableRipple color="secondary" />
                </ListItemIcon>
                <ListItemText primary={person.name} slotProps={{ primary: { sx: { color: 'navy.main', fontWeight: 500 } } }} />
                <Stack direction="row" sx={{ gap: 0.5, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  {person.roles.map((role) => <Chip key={role} label={role} size="small" variant="outlined" color="secondary" />)}
                </Stack>
              </ListItemButton>
            ))}
          </List>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button color="secondary" onClick={onClose} disabled={saving}>Cancelar</Button>
        <Button variant="contained" color="secondary" onClick={handleSave} loading={saving} disabled={selected.length === 0}>
          Agregar
        </Button>
      </DialogActions>
    </Dialog>
  )
}
