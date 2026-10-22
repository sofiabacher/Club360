import { useEffect, useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useTheme } from '@mui/material/styles'

import { createRole, getRole, updateRole } from '../../api/access.api.js'
import { getErrorMessage, getFieldErrors } from '../../utils/apiErrors.js'
import PermissionPicker from './PermissionPicker.jsx'

const emptyForm = { name: '', description: '', permissionIds: [] }

// Alta y edición de un rol: nombre, descripción y permisos. De pantalla completa en el celular.
// roleId null es un rol nuevo. onSaved recibe el rol guardado.
export default function RoleFormDialog({ open, roleId, permissionGroups, onClose, onSaved }) {
  const theme = useTheme()
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'))
  const isNew = roleId === null

  const [role, setRole] = useState(null)   // El rol tal como vino del back (null si es nuevo)
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  useEffect(() => {
    if (!open) return

    setError('')
    setFieldErrors({})

    if (isNew) {
      setRole(null)
      setForm(emptyForm)
      return
    }

    setLoading(true)
    getRole(roleId)
      .then(({ data }) => {
        setRole(data)
        setForm({ name: data.name, description: data.description ?? '', permissionIds: data.permissionIds })
      })
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false))
  }, [open, roleId, isNew])

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setFieldErrors({})
    setSaving(true)

    try {
      const payload = { name: form.name.trim(), description: form.description.trim(), permissionIds: form.permissionIds }
      const { data } = isNew ? await createRole(payload) : await updateRole(roleId, payload)
      onSaved(data, isNew)
    } catch (err) {
      setError(getErrorMessage(err))
      setFieldErrors(getFieldErrors(err))
    } finally {
      setSaving(false)
    }
  }

  const nameEditable = isNew || role?.editableName

  return (
    <Dialog
      open={open}
      onClose={saving ? undefined : onClose}
      fullScreen={fullScreen}
      fullWidth
      maxWidth="md"
      slotProps={{ paper: { component: 'form', onSubmit: handleSubmit, noValidate: true } }}
    >
      <DialogTitle sx={{ color: 'navy.main' }}>{isNew ? 'Nuevo rol' : `Editar ${role?.name ?? 'rol'}`}</DialogTitle>

      <DialogContent dividers>
        {loading ? (
          <Box sx={{ display: 'grid', placeItems: 'center', py: 6 }}>
            <CircularProgress color="secondary" />
          </Box>
        ) : (
          <Stack spacing={2.5}>
            {error && <Alert severity="error">{error}</Alert>}

            <TextField
              label="Nombre"
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              error={Boolean(fieldErrors.name)}
              helperText={fieldErrors.name ?? (nameEditable ? undefined : 'El nombre de los roles base no se puede cambiar')}
              slotProps={{ input: { readOnly: !nameEditable } }}
              required={nameEditable}
              autoFocus={isNew}
              fullWidth
            />
            <TextField
              label="Descripción"
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              error={Boolean(fieldErrors.description)}
              helperText={fieldErrors.description ?? `${form.description.length} de 200`}
              multiline
              minRows={2}
              fullWidth
            />

            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'navy.main', mb: 1 }}>
                Permisos
              </Typography>
              <PermissionPicker
                groups={permissionGroups}
                value={form.permissionIds}
                onChange={(permissionIds) => setForm({ ...form, permissionIds })}
                locked={role?.lockedPermissions ?? []}
                lockedReason="El rol Admin del Club siempre conserva este permiso, para que nunca quede nadie sin poder administrar los roles."
              />
            </Box>
          </Stack>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} color="inherit" disabled={saving}>Cancelar</Button>
        {/* En azul: el único botón naranja de la pantalla es "Nuevo rol" */}
        <Button type="submit" variant="contained" color="secondary" loading={saving} disabled={loading}>
          {isNew ? 'Crear rol' : 'Guardar cambios'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
