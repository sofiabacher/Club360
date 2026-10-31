import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

import { markAsRead } from '../api/notifications.api.js'
import useAuth from './useAuth.js'
import { getNotificationPath } from '../utils/notificationTypes.js'

// Evento para que la campana y el listado se enteren cuando cambian las notificaciones leídas
export const NOTIFICATIONS_CHANGED = 'club360:notifications-changed'
export const emitNotificationsChanged = () => window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED))

// Abrir una notificación: la marca como leída y, si su ruta está disponible para el rol activo, navega a ella.
// Devuelve una función (notification) => Promise
export default function useOpenNotification() {
  const navigate = useNavigate()
  const { permissions } = useAuth()

  return useCallback(async (notification) => {
    if (!notification.isRead) {
      try {
        await markAsRead(notification.id)
      } catch {
        // Si falla, igual se navega: la próxima vez se vuelve a marcar
      }
      emitNotificationsChanged()
    }

    const path = getNotificationPath(notification.type, permissions)
    if (path) navigate(path)
  }, [navigate, permissions])
}
