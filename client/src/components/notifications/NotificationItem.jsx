import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import ListItemButton from '@mui/material/ListItemButton'
import Typography from '@mui/material/Typography'

import { getNotificationIcon, getNotificationTone } from '../../utils/notificationTypes.js'
import { formatRelative } from '../../utils/format.js'

// Ícono del tipo, con el color de su tono (theme.status) o neutro
export function NotificationIcon({ type, size = 40 }) {
  const Icon = getNotificationIcon(type)
  const tone = getNotificationTone(type)

  return (
    <Avatar
      sx={(theme) => ({
        width: size,
        height: size,
        bgcolor: tone ? theme.status[tone].bg : 'cream.main',
        color: tone ? theme.status[tone].fg : 'navy.main'
      })}
    >
      <Icon fontSize="small" />
    </Avatar>
  )
}

// Una notificación: ícono, título (en negrita y con un punto Naranja si no está leída), el mensaje (salvo compact),
// quién la envió y la fecha relativa. clubName se muestra como emisor cuando la generó el sistema
export default function NotificationItem({ notification, clubName, compact = false, onClick }) {
  const unread = !notification.isRead

  return (
    <ListItemButton onClick={onClick} alignItems="flex-start" sx={{ gap: 1.5, py: 1.5, borderRadius: 2 }}>
      <NotificationIcon type={notification.type} size={compact ? 34 : 40} />
      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {unread && <Box component="span" sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'primary.main', flexShrink: 0 }} />}
          <Typography variant="body2" sx={{ fontWeight: unread ? 700 : 500, color: 'navy.main', overflowWrap: 'anywhere' }}>
            {notification.title}
          </Typography>
        </Box>
        {!compact && (
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5, whiteSpace: 'pre-line', overflowWrap: 'anywhere' }}>
            {notification.message}
          </Typography>
        )}
        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}>
          {compact ? formatRelative(notification.createdAt) : `${notification.transmitter ?? clubName} · ${formatRelative(notification.createdAt)}`}
        </Typography>
      </Box>
    </ListItemButton>
  )
}
