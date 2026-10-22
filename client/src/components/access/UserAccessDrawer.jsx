import { useEffect, useMemo, useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Checkbox from '@mui/material/Checkbox'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Drawer from '@mui/material/Drawer'
import FormControlLabel from '@mui/material/FormControlLabel'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import Typography from '@mui/material/Typography'
import CloseRounded from '@mui/icons-material/CloseRounded'

import { getUser, updateUserPermissions, updateUserRoles } from '../../api/access.api.js'
import useAuth from '../../hooks/useAuth.js'
import { getErrorMessage } from '../../utils/apiErrors.js'
import PermissionPicker from './PermissionPicker.jsx'

const sameIds = (a, b) => a.length === b.length && a.every((id) => b.includes(id))

// Panel lateral de un usuario: sus roles asignables y sus permisos directos. Pantalla completa en el celular.
// onChanged avisa a la lista que el usuario cambió (para actualizar sus chips de roles).
export default function UserAccessDrawer({ userId, permissionGroups, onClose, onChanged, onNotice }) {
  const { user: me, refreshSession } = useAuth()
  const isSelf = me?.id === userId

  const [tab, setTab] = useState('roles')
  const [user, setUser] = useState(null)
  const [roleIds, setRoleIds] = useState([])
  const [permissionIds, setPermissionIds] = useState([])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const showUser = (data) => {
    setUser(data)
    setRoleIds(data.roles.filter((role) => role.assignable).map((role) => role.id))
    setPermissionIds(data.permissionIds)
  }

  useEffect(() => {
    if (userId === null) return

    setTab('roles')
    setUser(null)
    setError('')
    getUser(userId)
      .then(({ data }) => showUser(data))
      .catch((err) => setError(getErrorMessage(err)))
  }, [userId])

  // Para cada permiso, si ya lo tiene por alguno de sus roles o si no le aplica por ser menor
  const hint = useMemo(() => {
    if (!user) return {}

    const result = {}
    const add = (id, text) => { result[id] = result[id] ? `${result[id]} · ${text}` : text }

    for (const group of permissionGroups) {
      for (const { id } of group.permissions) {
        const byRoles = user.roles.filter((role) => role.permissionIds.includes(id)).map((role) => role.name)
        if (byRoles.length > 0) add(id, `Ya lo tiene por el rol ${byRoles.join(', ')}`)
        if (user.restrictedPermissionIds.includes(id)) add(id, 'No le aplica: es menor de edad')
      }
    }

    return result
  }, [user, permissionGroups])

  const save = async (request, message) => {
    setError('')
    setSaving(true)

    try {
      const { data } = await request()
      showUser(data)
      onChanged()
      onNotice('success', message)
      if (isSelf) await refreshSession()   // Si el Admin se cambió a sí mismo, su menú cambia
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const toggleRole = (id) => setRoleIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])

  const circuitRoles = user?.roles.filter((role) => !role.assignable) ?? []
  const originalRoleIds = user?.roles.filter((role) => role.assignable).map((role) => role.id) ?? []

  return (
    <Drawer
      anchor="right"
      open={userId !== null}
      onClose={saving ? undefined : onClose}
      slotProps={{ paper: { sx: { width: { xs: '100%', sm: 520 } } } }}
    >
      <Stack direction="row" sx={{ alignItems: 'flex-start', gap: 1, p: 2, pb: 1 }}>
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography variant="h6" component="h2" sx={{ color: 'navy.main' }} noWrap>
            {user?.fullName ?? 'Usuario'}
          </Typography>
          {user && (
            <Typography variant="body2" sx={{ color: 'text.secondary' }} noWrap>
              {user.username ?? 'Sin usuario todavía'} · {user.email}
            </Typography>
          )}
        </Box>
        <IconButton onClick={onClose} disabled={saving} aria-label="Cerrar">
          <CloseRounded />
        </IconButton>
      </Stack>

      <Tabs value={tab} onChange={(event, value) => setTab(value)} textColor="secondary" indicatorColor="secondary" sx={{ px: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Tab value="roles" label="Roles" />
        <Tab value="permissions" label="Permisos directos" />
      </Tabs>

      <Box sx={{ p: 2, overflowY: 'auto', flexGrow: 1 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {!user && !error && (
          <Box sx={{ display: 'grid', placeItems: 'center', py: 6 }}>
            <CircularProgress color="secondary" />
          </Box>
        )}

        {user && tab === 'roles' && (
          <Stack spacing={3}>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'navy.main' }}>Roles asignables</Typography>
              <Stack>
                {user.assignableRoles.map((role) => (
                  <FormControlLabel
                    key={role.id}
                    sx={{ alignItems: 'flex-start', '& .MuiCheckbox-root': { pt: 0.5 } }}
                    control={<Checkbox color="secondary" checked={roleIds.includes(role.id)} onChange={() => toggleRole(role.id)} />}
                    label={
                      <Box sx={{ py: 0.75 }}>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>{role.name}</Typography>
                        {role.description && (
                          <Typography variant="caption" component="div" sx={{ color: 'text.secondary' }}>{role.description}</Typography>
                        )}
                      </Box>
                    }
                  />
                ))}
              </Stack>
            </Box>

            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'navy.main' }}>Roles de circuito</Typography>
              <Typography variant="caption" component="p" sx={{ color: 'text.secondary', mb: 1 }}>
                Se asignan desde el alta de socio, la inscripción, el vínculo familiar o el alta de staff.
              </Typography>
              {circuitRoles.length > 0 ? (
                <Stack direction="row" sx={{ gap: 1, flexWrap: 'wrap' }}>
                  {circuitRoles.map((role) => <Chip key={role.id} label={role.name} size="small" variant="outlined" />)}
                </Stack>
              ) : (
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>No tiene roles de circuito.</Typography>
              )}
            </Box>

            <Box>
              <Button
                variant="contained"
                color="primary"
                loading={saving}
                disabled={sameIds(roleIds, originalRoleIds)}
                onClick={() => save(() => updateUserRoles(user.id, roleIds), 'Guardamos los roles.')}
              >
                Guardar roles
              </Button>
            </Box>
          </Stack>
        )}

        {user && tab === 'permissions' && (
          <Stack spacing={2}>
            <Alert severity="info">Usalos para excepciones puntuales. Para varios usuarios conviene crear un rol.</Alert>
            <PermissionPicker groups={permissionGroups} value={permissionIds} onChange={setPermissionIds} hint={hint} />
            <Box>
              <Button
                variant="contained"
                color="primary"
                loading={saving}
                disabled={sameIds(permissionIds, user.permissionIds)}
                onClick={() => save(() => updateUserPermissions(user.id, permissionIds), 'Guardamos los permisos directos.')}
              >
                Guardar permisos
              </Button>
            </Box>
          </Stack>
        )}
      </Box>
    </Drawer>
  )
}
