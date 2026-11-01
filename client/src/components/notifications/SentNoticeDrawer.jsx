import { useEffect, useMemo, useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import Drawer from '@mui/material/Drawer'
import FormControlLabel from '@mui/material/FormControlLabel'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import LinearProgress from '@mui/material/LinearProgress'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import Stack from '@mui/material/Stack'
import Switch from '@mui/material/Switch'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import CloseRounded from '@mui/icons-material/CloseRounded'
import SearchRounded from '@mui/icons-material/SearchRounded'

import { getSentNotice } from '../../api/notifications.api.js'
import { getErrorMessage } from '../../utils/apiErrors.js'
import { formatDateTimeLong } from '../../utils/format.js'
import StatusChip from '../common/StatusChip.jsx'

// "Leído por 3 de 10" con su barra
export function ReadProgress({ readCount, recipientsCount }) {
  const value = recipientsCount > 0 ? (readCount / recipientsCount) * 100 : 0

  return (
    <Box>
      <Typography variant="body2" sx={{ color: 'navy.main', fontWeight: 600, mb: 0.5 }}>
        Leído por {readCount} de {recipientsCount}
      </Typography>
      <LinearProgress variant="determinate" value={value} color="secondary" sx={{ height: 8, borderRadius: 4 }} />
    </Box>
  )
}

const normalize = (text) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

// Detalle de un envío en un panel a la derecha (pantalla completa en el celular): el mensaje completo, la fecha, el
// resumen de lectura y los destinatarios con su estado, con buscador y el filtro "Solo sin leer"
export default function SentNoticeDrawer({ batchId, onClose }) {
  const [detail, setDetail] = useState(null)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [onlyUnread, setOnlyUnread] = useState(false)

  useEffect(() => {
    if (!batchId) return
    setDetail(null)
    setError('')
    setSearch('')
    setOnlyUnread(false)

    getSentNotice(batchId)
      .then(({ data }) => setDetail(data))
      .catch((err) => setError(getErrorMessage(err)))
  }, [batchId])

  const recipients = useMemo(() => {
    if (!detail) return []
    const words = normalize(search).split(/\s+/).filter(Boolean)

    return detail.recipients
      .filter((recipient) => !onlyUnread || !recipient.isRead)
      .filter((recipient) => words.every((word) => normalize(`${recipient.name} ${recipient.relation ?? ''}`).includes(word)))
  }, [detail, search, onlyUnread])

  return (
    <Drawer
      anchor="right"
      open={Boolean(batchId)}
      onClose={onClose}
      slotProps={{ paper: { sx: { width: { xs: '100%', sm: 480 }, maxWidth: '100%' } } }}
    >
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1.5, pt: 'calc(12px + env(safe-area-inset-top, 0px))' }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'navy.main' }}>Detalle del envío</Typography>
        <IconButton onClick={onClose} aria-label="Cerrar"><CloseRounded /></IconButton>
      </Stack>
      <Divider />

      <Box sx={{ p: { xs: 2, sm: 3 }, overflowY: 'auto' }}>
        {error && <Alert severity="error">{error}</Alert>}

        {!error && !detail && (
          <Box sx={{ display: 'grid', placeItems: 'center', py: 6 }}>
            <CircularProgress color="secondary" />
          </Box>
        )}

        {detail && (
          <>
            <Typography variant="h6" component="h2" sx={{ color: 'navy.main', overflowWrap: 'anywhere' }}>{detail.title}</Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', '&::first-letter': { textTransform: 'uppercase' } }}>
              {formatDateTimeLong(detail.sentAt)}{detail.sender ? ` · ${detail.sender.name}` : ''}
            </Typography>

            <Typography sx={{ whiteSpace: 'pre-line', overflowWrap: 'anywhere', mt: 2 }}>{detail.message}</Typography>

            <Box sx={{ my: 3 }}>
              <ReadProgress readCount={detail.readCount} recipientsCount={detail.recipientsCount} />
            </Box>

            <Divider sx={{ mb: 2 }} />
            <Typography variant="subtitle2" sx={{ color: 'navy.main', mb: 1 }}>Destinatarios</Typography>

            <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ gap: 1, alignItems: { sm: 'center' }, mb: 1 }}>
              <TextField
                placeholder="Buscar por nombre"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                size="small"
                sx={{ flexGrow: 1 }}
                slotProps={{
                  input: { startAdornment: <InputAdornment position="start"><SearchRounded /></InputAdornment> },
                  htmlInput: { 'aria-label': 'Buscar destinatarios' }
                }}
              />
              <FormControlLabel
                control={<Switch checked={onlyUnread} onChange={(event) => setOnlyUnread(event.target.checked)} color="secondary" size="small" />}
                label="Solo sin leer"
                sx={{ flexShrink: 0 }}
              />
            </Stack>

            {recipients.length === 0 ? (
              <Typography variant="body2" sx={{ color: 'text.secondary', py: 2, textAlign: 'center' }}>
                {onlyUnread && !search ? 'Todos lo leyeron.' : 'No hay destinatarios con esa búsqueda.'}
              </Typography>
            ) : (
              <List dense disablePadding>
                {recipients.map((recipient) => (
                  <ListItem key={recipient.userId} disableGutters divider sx={{ gap: 1 }}>
                    <ListItemText
                      primary={recipient.name}
                      secondary={recipient.relation}
                      slotProps={{ primary: { sx: { color: 'navy.main', fontWeight: 500 } } }}
                    />
                    <StatusChip status={recipient.isRead ? 'ok' : 'pending'} label={recipient.isRead ? 'Leído' : 'Sin leer'} />
                  </ListItem>
                ))}
              </List>
            )}
          </>
        )}
      </Box>
    </Drawer>
  )
}
