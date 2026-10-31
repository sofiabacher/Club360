import { useCallback, useEffect, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import Badge from '@mui/material/Badge'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import List from '@mui/material/List'
import Popover from '@mui/material/Popover'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import NotificationsRounded from '@mui/icons-material/NotificationsRounded'

import { getNotifications, getUnreadCount, markAllAsRead } from '../../api/notifications.api.js'
import useAuth from '../../hooks/useAuth.js'
import useOpenNotification, { NOTIFICATIONS_CHANGED, emitNotificationsChanged } from '../../hooks/useOpenNotification.js'
import NotificationItem from './NotificationItem.jsx'

const REFRESH_MS = 60 * 1000
const LATEST = 5

// Campana de la barra superior: contador de no leídas en Naranja (es lo urgente) y, al tocarla, las últimas 5.
// El contador se pide al cargar, cada 60 segundos mientras la pestaña está visible, al volver a la pestaña y cuando
// cambian las leídas (evento NOTIFICATIONS_CHANGED)
export default function NotificationBell() {
  const { club } = useAuth()
  const openNotification = useOpenNotification()

  const [count, setCount] = useState(0)
  const [anchor, setAnchor] = useState(null)
  const [latest, setLatest] = useState(null)

  const refreshCount = useCallback(() => {
    getUnreadCount()
      .then(({ data }) => setCount(data.count))
      .catch(() => {})   // Si falla, queda el último valor; se reintenta en el próximo ciclo
  }, [])

  useEffect(() => {
    refreshCount()

    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') refreshCount()
    }, REFRESH_MS)

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') refreshCount()
    }

    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener(NOTIFICATIONS_CHANGED, refreshCount)

    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener(NOTIFICATIONS_CHANGED, refreshCount)
    }
  }, [refreshCount])

  const handleOpen = (event) => {
    setAnchor(event.currentTarget)
    setLatest(null)
    getNotifications({ page: 1 })
      .then(({ data }) => setLatest(data.items.slice(0, LATEST)))
      .catch(() => setLatest([]))
    refreshCount()
  }

  const close = () => setAnchor(null)

  const handleItem = async (notification) => {
    close()
    await openNotification(notification)
  }

  const handleReadAll = async () => {
    try {
      await markAllAsRead()
      setLatest((current) => current?.map((item) => ({ ...item, isRead: true })) ?? current)
      emitNotificationsChanged()
    } catch {
      // Se puede volver a intentar desde el listado
    }
  }

  return (
    <>
      <IconButton onClick={handleOpen} aria-label={count > 0 ? `Notificaciones: ${count} sin leer` : 'Notificaciones'}>
        <Badge badgeContent={count} color="primary" max={99}>
          <NotificationsRounded />
        </Badge>
      </IconButton>

      <Popover
        open={Boolean(anchor)}
        anchorEl={anchor}
        onClose={close}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { width: 360, maxWidth: 'calc(100vw - 32px)', borderRadius: 3 } } }}
      >
        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1.5 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'navy.main' }}>Notificaciones</Typography>
          <Button size="small" color="secondary" onClick={handleReadAll} disabled={count === 0}>Marcar todas como leídas</Button>
        </Stack>
        <Divider />

        {!latest && (
          <Box sx={{ display: 'grid', placeItems: 'center', py: 4 }}>
            <CircularProgress color="secondary" size={28} />
          </Box>
        )}

        {latest && latest.length === 0 && (
          <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center', py: 4, px: 2 }}>
            No tenés notificaciones.
          </Typography>
        )}

        {latest && latest.length > 0 && (
          <List dense sx={{ px: 1 }}>
            {latest.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                clubName={club?.name}
                compact
                onClick={() => handleItem(notification)}
              />
            ))}
          </List>
        )}

        <Divider />
        <Box sx={{ p: 1, textAlign: 'center' }}>
          <Button component={RouterLink} to="/notifications" color="secondary" onClick={close} fullWidth>Ver todas</Button>
        </Box>
      </Popover>
    </>
  )
}
