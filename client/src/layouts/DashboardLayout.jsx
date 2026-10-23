import { useMemo, useState } from 'react'
import { Link as RouterLink, Outlet, useLocation } from 'react-router-dom'
import Alert from '@mui/material/Alert'
import AppBar from '@mui/material/AppBar'
import Box from '@mui/material/Box'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import Snackbar from '@mui/material/Snackbar'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useTheme } from '@mui/material/styles'
import MenuRounded from '@mui/icons-material/MenuRounded'
import NotificationsRounded from '@mui/icons-material/NotificationsRounded'

import Sidebar from '../components/layout/Sidebar.jsx'
import UserMenu from '../components/layout/UserMenu.jsx'
import useAuth from '../hooks/useAuth.js'
import usePermission from '../hooks/usePermission.js'
import { getSectionTitle, getVisibleMenu } from '../navigation/menu.js'

const DRAWER_WIDTH = 240

// Layout de todas las pantallas con sesión: menú lateral Marino (fijo en escritorio, desplegable en el celular),
// barra superior blanca con el título de la sección, la campana y el avatar, y el contenido sobre el fondo de trabajo.
// Al imprimir (por ejemplo, el comprobante del alta de un socio) se esconden el menú y la barra: queda solo el contenido.
export default function DashboardLayout() {
  const theme = useTheme()
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'))
  const location = useLocation()
  const { club, permissions } = useAuth()
  const { hasPermission } = usePermission()

  const [mobileOpen, setMobileOpen] = useState(false)
  const [error, setError] = useState('')

  const items = useMemo(() => getVisibleMenu(permissions), [permissions])
  const title = getSectionTitle(location.pathname, items)

  const sidebar = <Sidebar items={items} club={club} onNavigate={() => setMobileOpen(false)} />
  const paperSx = { width: DRAWER_WIDTH, bgcolor: 'navy.main', color: 'navy.contrastText', border: 'none' }

  return (
    <Box sx={{ display: 'flex', minHeight: '100dvh', bgcolor: 'background.default', '@media print': { bgcolor: 'background.paper' } }}>
      <Box sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 }, displayPrint: 'none' }}>
        {isDesktop ? (
          <Drawer variant="permanent" open slotProps={{ paper: { sx: paperSx } }}>
            {sidebar}
          </Drawer>
        ) : (
          <Drawer
            variant="temporary"
            open={mobileOpen}
            onClose={() => setMobileOpen(false)}
            ModalProps={{ keepMounted: true }}
            slotProps={{ paper: { sx: paperSx } }}
          >
            {sidebar}
          </Drawer>
        )}
      </Box>

      <Box sx={{ flexGrow: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <AppBar
          position="sticky"
          color="inherit"
          elevation={0}
          sx={{ bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider', displayPrint: 'none' }}
        >
          <Toolbar sx={{ gap: 1 }}>
            {!isDesktop && (
              <IconButton edge="start" onClick={() => setMobileOpen(true)} aria-label="Abrir el menú">
                <MenuRounded />
              </IconButton>
            )}

            <Typography variant="h6" component="h1" noWrap sx={{ flexGrow: 1, color: 'navy.main' }}>
              {title}
            </Typography>

            {hasPermission('notifications.view') && (
              <IconButton component={RouterLink} to="/notifications" aria-label="Notificaciones">
                <NotificationsRounded />
              </IconButton>
            )}

            <UserMenu onError={setError} />
          </Toolbar>
        </AppBar>

        <Box component="main" sx={{ flexGrow: 1, px: { xs: 2, sm: 3, md: 4 }, py: { xs: 2, sm: 3 }, '@media print': { p: 0 } }}>
          <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
            <Outlet />
          </Box>
        </Box>
      </Box>

      <Snackbar
        open={Boolean(error)}
        autoHideDuration={6000}
        onClose={() => setError('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="error" variant="filled" onClose={() => setError('')}>
          {error}
        </Alert>
      </Snackbar>
    </Box>
  )
}
