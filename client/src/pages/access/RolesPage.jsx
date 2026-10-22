import { useCallback, useEffect, useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardActions from '@mui/material/CardActions'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import Grid from '@mui/material/Grid'
import Snackbar from '@mui/material/Snackbar'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import AddRounded from '@mui/icons-material/AddRounded'
import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded'
import EditRounded from '@mui/icons-material/EditRounded'

import { deleteRole, getPermissions, getRoles } from '../../api/access.api.js'
import RoleFormDialog from '../../components/access/RoleFormDialog.jsx'
import useAuth from '../../hooks/useAuth.js'
import { getErrorMessage } from '../../utils/apiErrors.js'

const plural = (count, singular, pluralForm) => `${count} ${count === 1 ? singular : pluralForm}`

function RoleCard({ role, onEdit, onDelete }) {
  const deleteButton = (
    <Button color="error" size="small" startIcon={<DeleteOutlineRounded />} onClick={() => onDelete(role)} disabled={role.userCount > 0}>
      Eliminar
    </Button>
  )

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flexGrow: 1 }}>
        <Stack direction="row" sx={{ alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 1 }}>
          <Typography variant="h6" component="h3" sx={{ color: 'navy.main' }}>{role.name}</Typography>
          {role.isBase && <Chip label="Rol base" size="small" sx={{ bgcolor: 'cream.main', color: 'navy.main', fontWeight: 600 }} />}
        </Stack>
        <Typography variant="body2" sx={{ color: 'text.secondary', minHeight: '2.5em' }}>
          {role.description || 'Sin descripción'}
        </Typography>
        <Typography variant="body2" sx={{ mt: 2, fontWeight: 500 }}>
          {plural(role.permissionCount, 'permiso', 'permisos')} · {plural(role.userCount, 'usuario', 'usuarios')}
        </Typography>
      </CardContent>

      <CardActions sx={{ px: 2, pb: 2 }}>
        <Button color="secondary" size="small" startIcon={<EditRounded />} onClick={() => onEdit(role)}>
          Editar
        </Button>
        {!role.isBase && (role.userCount > 0
          ? (
            <Tooltip title="Tiene usuarios asignados. Quitáselo a cada uno desde Usuarios y roles antes de eliminarlo.">
              <span>{deleteButton}</span>
            </Tooltip>
          )
          : deleteButton)}
      </CardActions>
    </Card>
  )
}

// Roles del club: base y nuevos, con sus permisos. Pantalla de access.manageRoles
export default function RolesPage() {
  const { refreshSession } = useAuth()

  const [roles, setRoles] = useState(null)
  const [permissionGroups, setPermissionGroups] = useState([])
  const [loadError, setLoadError] = useState('')
  const [notice, setNotice] = useState({ open: false, severity: 'success', message: '' })   // Snackbar
  const showNotice = (severity, message) => setNotice({ open: true, severity, message })
  const closeNotice = () => setNotice((current) => ({ ...current, open: false }))

  const [form, setForm] = useState({ open: false, roleId: null })   // Diálogo de alta y edición
  const [toDelete, setToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const loadRoles = useCallback(() => getRoles().then(({ data }) => setRoles(data)), [])

  useEffect(() => {
    Promise.all([loadRoles(), getPermissions().then(({ data }) => setPermissionGroups(data))])
      .catch((err) => setLoadError(getErrorMessage(err)))
  }, [loadRoles])

  const handleSaved = async (role, isNew) => {
    setForm({ open: false, roleId: null })
    showNotice('success', isNew ? `Creamos el rol ${role.name}.` : `Guardamos los cambios de ${role.name}.`)

    try {
      // Si el rol editado es el activo, el menú propio cambia
      await Promise.all([loadRoles(), refreshSession()])
    } catch (err) {
      showNotice('error', getErrorMessage(err))
    }
  }

  const handleDelete = async () => {
    setDeleting(true)

    try {
      await deleteRole(toDelete.id)
      showNotice('success', `Eliminamos el rol ${toDelete.name}.`)
      setToDelete(null)
      await loadRoles()
    } catch (err) {
      showNotice('error', getErrorMessage(err))
      setToDelete(null)
    } finally {
      setDeleting(false)
    }
  }

  if (loadError) return <Alert severity="error">{loadError}</Alert>

  if (!roles) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}>
        <CircularProgress color="secondary" />
      </Box>
    )
  }

  return (
    <>
      <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between', gap: 2, mb: 3 }}>
        <Box>
          <Typography variant="h5" component="h2" sx={{ color: 'navy.main' }}>Roles y permisos</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Cada rol es un conjunto de permisos. Los roles base no se eliminan ni se renombran.
          </Typography>
        </Box>
        <Button variant="contained" color="primary" startIcon={<AddRounded />} onClick={() => setForm({ open: true, roleId: null })} sx={{ flexShrink: 0 }}>
          Nuevo rol
        </Button>
      </Stack>

      <Grid container spacing={2}>
        {roles.map((role) => (
          <Grid key={role.id} size={{ xs: 12, sm: 6, lg: 4 }}>
            <RoleCard role={role} onEdit={() => setForm({ open: true, roleId: role.id })} onDelete={setToDelete} />
          </Grid>
        ))}
      </Grid>

      <RoleFormDialog
        open={form.open}
        roleId={form.roleId}
        permissionGroups={permissionGroups}
        onClose={() => setForm({ open: false, roleId: null })}
        onSaved={handleSaved}
      />

      <Dialog open={Boolean(toDelete)} onClose={deleting ? undefined : () => setToDelete(null)}>
        <DialogTitle sx={{ color: 'navy.main' }}>¿Eliminar el rol {toDelete?.name}?</DialogTitle>
        <DialogContent>
          <DialogContentText>Se borra el rol con sus permisos. Esta acción no se puede deshacer.</DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setToDelete(null)} color="inherit" disabled={deleting}>Cancelar</Button>
          <Button onClick={handleDelete} variant="contained" color="error" loading={deleting}>Eliminar</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={notice.open} autoHideDuration={5000} onClose={closeNotice} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={notice.severity} variant="filled" onClose={closeNotice}>{notice.message}</Alert>
      </Snackbar>
    </>
  )
}
