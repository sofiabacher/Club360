import { useEffect, useState } from 'react'
import { Link as RouterLink, useSearchParams } from 'react-router-dom'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardActionArea from '@mui/material/CardActionArea'
import CardContent from '@mui/material/CardContent'
import CircularProgress from '@mui/material/CircularProgress'
import MenuItem from '@mui/material/MenuItem'
import Pagination from '@mui/material/Pagination'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import CampaignRounded from '@mui/icons-material/CampaignRounded'
import ManageHistoryRounded from '@mui/icons-material/ManageHistoryRounded'

import { getSentNotices } from '../../api/notifications.api.js'
import EmptyState from '../../components/common/EmptyState.jsx'
import SentNoticeDrawer, { ReadProgress } from '../../components/notifications/SentNoticeDrawer.jsx'
import { getErrorMessage } from '../../utils/apiErrors.js'
import { formatDateTimeLong } from '../../utils/format.js'

// Historial de avisos enviados: una tarjeta por envío con cuántos lo leyeron. El Admin (notifications.sendAll) ve todos
// los del club, con un filtro por remitente; el resto, solo los suyos. Tocar una tarjeta abre el detalle.
// Con ?batch= en la URL se abre ese envío (lo usa "Ver en el historial" después de enviar).
export default function SentNoticesPage() {
  const [searchParams, setSearchParams] = useSearchParams()

  const [query, setQuery] = useState({ page: 1, senderId: '' })
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [openBatch, setOpenBatch] = useState(searchParams.get('batch'))

  useEffect(() => {
    setLoading(true)
    getSentNotices(query)
      .then(({ data }) => {
        setResult(data)
        setError('')
      })
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false))
  }, [query])

  const closeDrawer = () => {
    setOpenBatch(null)
    if (searchParams.get('batch')) setSearchParams({}, { replace: true })
  }

  const items = result?.items ?? []

  return (
    <>
      <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between', gap: 2, mb: 3 }}>
        <Box>
          <Typography variant="h5" component="h2" sx={{ color: 'navy.main' }}>Avisos enviados</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {result?.canSeeAll ? 'Todos los avisos generales del club y cuántos los leyeron.' : 'Tus avisos y cuántos los leyeron.'}
          </Typography>
        </Box>
        <Button component={RouterLink} to="/notifications/send" color="secondary" startIcon={<CampaignRounded />} sx={{ flexShrink: 0 }}>
          Enviar un aviso
        </Button>
      </Stack>

      {result?.canSeeAll && result.senders.length > 0 && (
        <TextField
          select
          label="Remitente"
          value={query.senderId}
          onChange={(event) => setQuery({ page: 1, senderId: event.target.value })}
          size="small"
          sx={{ minWidth: 240, mb: 3 }}
        >
          <MenuItem value="">Todos</MenuItem>
          {result.senders.map((sender) => <MenuItem key={sender.id} value={sender.id}>{sender.name}</MenuItem>)}
        </TextField>
      )}

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {!result && loading && (
        <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}>
          <CircularProgress color="secondary" />
        </Box>
      )}

      {result && items.length === 0 && (
        <EmptyState
          icon={ManageHistoryRounded}
          title="Sin avisos"
          description={query.senderId ? 'Esta persona todavía no envió avisos.' : 'Todavía no enviaste avisos.'}
        />
      )}

      <Stack spacing={2} sx={{ opacity: loading ? 0.6 : 1 }}>
        {items.map((item) => (
          <Card key={item.batchId}>
            <CardActionArea onClick={() => setOpenBatch(item.batchId)}>
              <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'navy.main', overflowWrap: 'anywhere' }}>{item.title}</Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', '&::first-letter': { textTransform: 'uppercase' } }}>
                  {formatDateTimeLong(item.sentAt)}{result.canSeeAll && item.sender ? ` · ${item.sender.name}` : ''}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ color: 'text.secondary', mt: 1, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', overflowWrap: 'anywhere' }}
                >
                  {item.message}
                </Typography>
                <Box sx={{ mt: 2, maxWidth: 360 }}>
                  <ReadProgress readCount={item.readCount} recipientsCount={item.recipientsCount} />
                </Box>
              </CardContent>
            </CardActionArea>
          </Card>
        ))}
      </Stack>

      {result && result.totalPages > 1 && (
        <Stack sx={{ alignItems: 'center', mt: 3 }}>
          <Pagination count={result.totalPages} page={result.page} onChange={(event, page) => setQuery((current) => ({ ...current, page }))} color="secondary" />
        </Stack>
      )}

      <SentNoticeDrawer batchId={openBatch} onClose={closeDrawer} />
    </>
  )
}
