import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import List from '@mui/material/List'
import Pagination from '@mui/material/Pagination'
import Snackbar from '@mui/material/Snackbar'
import Stack from '@mui/material/Stack'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import DoneAllRounded from '@mui/icons-material/DoneAllRounded'
import NotificationsNoneRounded from '@mui/icons-material/NotificationsNoneRounded'

import { getNotifications, markAllAsRead } from '../../api/notifications.api.js'
import EmptyState from '../../components/common/EmptyState.jsx'
import NotificationDialog from '../../components/notifications/NotificationDialog.jsx'
import NotificationItem from '../../components/notifications/NotificationItem.jsx'
import useAuth from '../../hooks/useAuth.js'
import useOpenNotification, { NOTIFICATIONS_CHANGED, emitNotificationsChanged } from '../../hooks/useOpenNotification.js'
import { getErrorMessage } from '../../utils/apiErrors.js'

const TABS = { ALL: 'all', UNREAD: 'unread' }

// Notificaciones del usuario, las más nuevas primero. Tocar una abre su detalle (NotificationDialog), que la marca
// como leída. Con ?id= en la URL se abre esa notificación aunque no esté en la página cargada.
// Pantalla de notifications.view
export default function NotificationsPage() {
  const { club } = useAuth()
  const { dialogProps, openNotification, openNotificationById } = useOpenNotification()
  const [searchParams, setSearchParams] = useSearchParams()

  const [tab, setTab] = useState(TABS.ALL)
  const [page, setPage] = useState(1)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState({ open: false, severity: 'success', message: '' })   // Snackbar
  const closeNotice = () => setNotice((current) => ({ ...current, open: false }))

  const load = useCallback(() => {
    setLoading(true)
    getNotifications({ unread: tab === TABS.UNREAD, page })
      .then(({ data }) => {
        setResult(data)
        setError('')
      })
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false))
  }, [tab, page])

  useEffect(() => {
    load()
  }, [load])

  // Link directo a una notificación (/notifications?id=5): se abre el detalle y se limpia la URL
  useEffect(() => {
    const id = Number(searchParams.get('id'))
    if (!id) return

    openNotificationById(id)
    setSearchParams({}, { replace: true })
  }, [searchParams, setSearchParams, openNotificationById])

  // Si se marcan desde la campana, la lista se actualiza
  useEffect(() => {
    window.addEventListener(NOTIFICATIONS_CHANGED, load)
    return () => window.removeEventListener(NOTIFICATIONS_CHANGED, load)
  }, [load])

  const changeTab = (event, value) => {
    setTab(value)
    setPage(1)
  }

  const handleReadAll = async () => {
    try {
      const { data } = await markAllAsRead()
      emitNotificationsChanged()
      setNotice({ open: true, severity: 'success', message: data.updated > 0 ? 'Marcamos todas como leídas.' : 'Ya estaban todas leídas.' })
    } catch (err) {
      setNotice({ open: true, severity: 'error', message: getErrorMessage(err) })
    }
  }

  const items = result?.items ?? []

  return (
    <>
      <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between', gap: 1, mb: 2 }}>
        <Tabs value={tab} onChange={changeTab} textColor="secondary" indicatorColor="secondary">
          <Tab value={TABS.ALL} label="Todas" />
          <Tab value={TABS.UNREAD} label="Sin leer" />
        </Tabs>
        <Button color="secondary" startIcon={<DoneAllRounded />} onClick={handleReadAll} sx={{ alignSelf: { xs: 'flex-start', sm: 'center' } }}>
          Marcar todas como leídas
        </Button>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {!result && loading && (
        <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}>
          <CircularProgress color="secondary" />
        </Box>
      )}

      {result && items.length === 0 && (
        <EmptyState
          icon={NotificationsNoneRounded}
          title={tab === TABS.UNREAD ? 'Todo al día' : 'Sin notificaciones'}
          description={tab === TABS.UNREAD ? 'Estás al día: no tenés notificaciones sin leer.' : 'No tenés notificaciones.'}
        />
      )}

      {items.length > 0 && (
        <Card sx={{ opacity: loading ? 0.6 : 1 }}>
          <List disablePadding sx={{ p: 1 }}>
            {items.map((notification, index) => (
              <Box key={notification.id}>
                {index > 0 && <Divider component="li" sx={{ my: 0.5 }} />}
                <NotificationItem notification={notification} clubName={club?.name} onClick={() => openNotification(notification)} />
              </Box>
            ))}
          </List>
        </Card>
      )}

      {result && result.totalPages > 1 && (
        <Stack sx={{ alignItems: 'center', mt: 3 }}>
          <Pagination count={result.totalPages} page={result.page} onChange={(event, value) => setPage(value)} color="secondary" />
        </Stack>
      )}

      <NotificationDialog {...dialogProps} />

      <Snackbar open={notice.open} autoHideDuration={4000} onClose={closeNotice} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={notice.severity} variant="filled" onClose={closeNotice}>{notice.message}</Alert>
      </Snackbar>
    </>
  )
}
