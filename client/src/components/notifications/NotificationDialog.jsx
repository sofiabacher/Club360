import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useTheme } from '@mui/material/styles'
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded'

import { getNotification, markAsRead } from '../../api/notifications.api.js'
import useAuth from '../../hooks/useAuth.js'
import { emitNotificationsChanged } from '../../hooks/useOpenNotification.js'
import { getErrorMessage } from '../../utils/apiErrors.js'
import { formatDateTimeLong } from '../../utils/format.js'
import { getNotificationTarget } from '../../utils/notificationTypes.js'
import { NotificationIcon } from './NotificationItem.jsx'

// Detalle de una notificación en una ventana flotante (pantalla completa en el celular): ícono, título, fecha completa,
// quién la envió ("{club}" si es del sistema), el mensaje completo y, si el tipo tiene ruta disponible para el rol
// activo, el botón "Ir a {sección}". Abrirla la marca como leída y actualiza la campana.
// notification: la notificación ya cargada; notificationId: si no está cargada, se trae del back (una ajena da 404)
export default function NotificationDialog({ open, notification: loaded, notificationId, onClose }) {
  const theme = useTheme()
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'))
  const navigate = useNavigate()
  const { club, permissions } = useAuth()

  const [notification, setNotification] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setError('')
    setNotification(loaded ?? null)

    if (!loaded && notificationId) {
      getNotification(notificationId)
        .then(({ data }) => setNotification(data))
        .catch((err) => setError(getErrorMessage(err)))
    }
  }, [open, loaded, notificationId])

  // Al abrirla queda leída
  useEffect(() => {
    if (!open || !notification || notification.isRead) return

    markAsRead(notification.id)
      .then(() => {
        setNotification((current) => (current?.id === notification.id ? { ...current, isRead: true } : current))
        emitNotificationsChanged()
      })
      .catch(() => {})   // Si falla, sigue sin leer y se puede volver a abrir
  }, [open, notification])

  const target = notification ? getNotificationTarget(notification.type, permissions) : null

  const goToSection = () => {
    onClose()
    navigate(target.path)
  }

  return (
    <Dialog open={open} onClose={onClose} fullScreen={fullScreen} fullWidth maxWidth="sm" aria-labelledby="notification-dialog-title">
      <DialogContent sx={{ pt: 3 }}>
        {error && <Alert severity="error">{error}</Alert>}

        {!error && !notification && (
          <Box sx={{ display: 'grid', placeItems: 'center', py: 6 }}>
            <CircularProgress color="secondary" />
          </Box>
        )}

        {notification && (
          <>
            <Stack direction="row" spacing={2} sx={{ alignItems: 'flex-start', mb: 2 }}>
              <NotificationIcon type={notification.type} size={48} />
              <Box sx={{ minWidth: 0 }}>
                <Typography id="notification-dialog-title" variant="h6" component="h2" sx={{ color: 'navy.main', overflowWrap: 'anywhere' }}>
                  {notification.title}
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', '&::first-letter': { textTransform: 'uppercase' } }}>
                  {formatDateTimeLong(notification.createdAt)}
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  De: {notification.transmitter ?? club?.name}
                </Typography>
              </Box>
            </Stack>

            <Typography sx={{ whiteSpace: 'pre-line', overflowWrap: 'anywhere', color: 'text.primary' }}>
              {notification.message}
            </Typography>
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2, gap: 1, flexWrap: 'wrap' }}>
        <Button color="secondary" onClick={onClose}>Cerrar</Button>
        {target && (
          <Button variant="contained" color="secondary" endIcon={<ArrowForwardRounded />} onClick={goToSection}>
            Ir a {target.label}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}
