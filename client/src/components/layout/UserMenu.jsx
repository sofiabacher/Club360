import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import ListSubheader from '@mui/material/ListSubheader'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Typography from '@mui/material/Typography'
import CheckRounded from '@mui/icons-material/CheckRounded'
import LogoutRounded from '@mui/icons-material/LogoutRounded'
import PersonRounded from '@mui/icons-material/PersonRounded'

import { switchRole } from '../../api/auth.api.js'
import UserAvatar from '../common/UserAvatar.jsx'
import useAuth from '../../hooks/useAuth.js'
import usePermission from '../../hooks/usePermission.js'
import { getErrorMessage } from '../../utils/apiErrors.js'

// Menú del avatar: datos del usuario y rol activo, cambio de rol, Mi cuenta y cerrar sesión.
// onError recibe el mensaje si falla el cambio de rol.
export default function UserMenu({ onError }) {
  const navigate = useNavigate()
  const { user, roles, activeRole, startSession, endSession } = useAuth()
  const { hasPermission } = usePermission()

  const [anchor, setAnchor] = useState(null)
  const [switchingId, setSwitchingId] = useState(null)

  const close = () => setAnchor(null)

  const go = (path) => {
    close()
    navigate(path)
  }

  // Los permisos cambian con el rol: se vuelve al inicio con el token nuevo
  const handleSwitch = async (roleId) => {
    if (roleId === activeRole?.id) return close()

    setSwitchingId(roleId)

    try {
      const { data } = await switchRole(roleId)
      startSession({ token: data.token, session: data.session })
      close()
      navigate('/', { replace: true })
    } catch (err) {
      onError?.(getErrorMessage(err))
    } finally {
      setSwitchingId(null)
    }
  }

  const handleLogout = async () => {
    close()
    await endSession()
    navigate('/login', { replace: true })
  }

  return (
    <>
      <IconButton onClick={(event) => setAnchor(event.currentTarget)} aria-label="Menú de la cuenta" sx={{ p: 0.5 }}>
        <UserAvatar user={user} size={38} />
      </IconButton>

      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={close}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { mt: 1, minWidth: 260, maxWidth: 'calc(100vw - 32px)' } } }}
      >
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography sx={{ fontWeight: 600, color: 'navy.main' }}>
            {user.name} {user.lastName}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {user.username}
          </Typography>
          {activeRole && <Chip size="small" label={activeRole.name} sx={{ mt: 1, fontWeight: 600 }} />}
        </Box>

        {roles.length > 1 && [
          <Divider key="roles-divider" />,
          <ListSubheader key="roles-title" sx={{ lineHeight: '36px' }}>Cambiar de rol</ListSubheader>,
          ...roles.map((role) => {
            const isActive = role.id === activeRole?.id

            return (
              <MenuItem
                key={role.id}
                selected={isActive}
                disabled={switchingId !== null}
                onClick={() => handleSwitch(role.id)}
              >
                <ListItemIcon sx={{ color: 'secondary.main' }}>
                  {switchingId === role.id ? <CircularProgress size={18} color="secondary" /> : isActive && <CheckRounded fontSize="small" />}
                </ListItemIcon>
                <ListItemText primary={role.name} />
              </MenuItem>
            )
          })
        ]}

        <Divider />

        {hasPermission('auth.manageAccount') && (
          <MenuItem onClick={() => go('/account')}>
            <ListItemIcon><PersonRounded fontSize="small" /></ListItemIcon>
            <ListItemText primary="Mi cuenta" />
          </MenuItem>
        )}

        <MenuItem onClick={handleLogout}>
          <ListItemIcon><LogoutRounded fontSize="small" /></ListItemIcon>
          <ListItemText primary="Cerrar sesión" />
        </MenuItem>
      </Menu>
    </>
  )
}
