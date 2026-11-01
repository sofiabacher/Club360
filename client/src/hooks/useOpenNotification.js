import { useCallback, useState } from 'react'

// Evento para que la campana y el listado se enteren cuando cambian las notificaciones leídas
export const NOTIFICATIONS_CHANGED = 'club360:notifications-changed'
export const emitNotificationsChanged = () => window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED))

// Estado del detalle de una notificación (NotificationDialog). Tocar una notificación la abre en la ventana flotante
// (no navega directo): openNotification(notification) con la notificación cargada, o openNotificationById(id) si no está
// en la lista (el diálogo la trae del back). Uso:
//   const { dialogProps, openNotification } = useOpenNotification()
//   <NotificationDialog {...dialogProps} />
export default function useOpenNotification() {
  const [current, setCurrent] = useState(null)   // { notification } o { id }

  const openNotification = useCallback((notification) => setCurrent({ notification }), [])
  const openNotificationById = useCallback((id) => setCurrent({ id }), [])
  const close = useCallback(() => setCurrent(null), [])

  return {
    openNotification,
    openNotificationById,
    dialogProps: {
      open: Boolean(current),
      notification: current?.notification ?? null,
      notificationId: current?.id ?? null,
      onClose: close
    }
  }
}
