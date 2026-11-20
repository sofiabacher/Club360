import { useCallback, useEffect, useState } from 'react'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardActionArea from '@mui/material/CardActionArea'
import CardContent from '@mui/material/CardContent'
import LinearProgress from '@mui/material/LinearProgress'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import AddRounded from '@mui/icons-material/AddRounded'
import PostAddRounded from '@mui/icons-material/PostAddRounded'

import { getCharges } from '../../api/fees.api.js'
import ChargeFormDialog from '../../components/fees/ChargeFormDialog.jsx'
import EmptyState from '../../components/common/EmptyState.jsx'
import LoadingSkeleton from '../../components/common/LoadingSkeleton.jsx'
import PageHeader from '../../components/common/PageHeader.jsx'
import StatusChip from '../../components/common/StatusChip.jsx'
import { getErrorMessage } from '../../utils/apiErrors.js'
import { formatDate, formatDayMonth, formatMoney } from '../../utils/format.js'

// Una tarjeta por cargo: concepto, a quiénes, monto, vencimiento y cuántos pagaron
function ChargeCard({ charge }) {
  const billed = charge.counts.total - charge.counts.cancelled
  const progress = billed > 0 ? (charge.counts.paid / billed) * 100 : 0

  return (
    <Card>
      <CardActionArea component={RouterLink} to={`/fees/charges/${charge.id}`}>
        <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ gap: { xs: 1, sm: 2 }, justifyContent: 'space-between', alignItems: { sm: 'flex-start' } }}>
            <Box sx={{ minWidth: 0 }}>
              <Stack direction="row" sx={{ alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Typography sx={{ fontWeight: 600, color: 'navy.main', overflowWrap: 'anywhere' }}>{charge.concept}</Typography>
                {!charge.isActive && <StatusChip status="neutral" label="Anulado" />}
                {charge.inReview > 0 && <StatusChip status="pending" label={`${charge.inReview} por revisar`} />}
              </Stack>
              <Typography variant="body2" sx={{ color: 'text.secondary', overflowWrap: 'anywhere' }}>
                {charge.targetLabel} · Vence el {formatDayMonth(charge.expirationDate)}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Creado el {formatDate(charge.createdAt)}{charge.author ? ` por ${charge.author}` : ''}
              </Typography>
            </Box>
            <Box sx={{ textAlign: { sm: 'right' }, flexShrink: 0 }}>
              <Typography variant="numeric" sx={{ fontSize: '1.5rem', color: 'navy.main', lineHeight: 1.1 }}>{formatMoney(charge.amount)}</Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>por socio</Typography>
            </Box>
          </Stack>

          <Box sx={{ mt: 1.5 }}>
            <LinearProgress variant="determinate" value={progress} color="secondary" sx={{ height: 6, borderRadius: 1, bgcolor: 'tint.main' }} />
            <Stack direction="row" sx={{ justifyContent: 'space-between', mt: 0.75, gap: 1, flexWrap: 'wrap' }}>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Pagaron {charge.counts.paid} de {billed}
                {charge.counts.overdue > 0 ? ` · ${charge.counts.overdue} vencidos` : ''}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>Cobrado {formatMoney(charge.collected)}</Typography>
            </Stack>
          </Box>
        </CardContent>
      </CardActionArea>
    </Card>
  )
}

// Cargos eventuales (fees.manage): los cobros aparte de la cuota mensual, con cuánto se cobró de cada uno. "Nuevo cargo"
// abre el alta; tocar un cargo abre su detalle
export default function ChargesPage() {
  const navigate = useNavigate()
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)

  const load = useCallback(() => {
    getCharges()
      .then(({ data }) => setResult(data))
      .catch((err) => setError(getErrorMessage(err)))
  }, [])

  useEffect(() => { load() }, [load])

  const newButton = (
    <Button variant="contained" color="primary" startIcon={<AddRounded />} onClick={() => setCreating(true)}>Nuevo cargo</Button>
  )

  return (
    <>
      <PageHeader
        title="Cargos eventuales"
        description="Cobros aparte de la cuota, como un torneo, la indumentaria o un viaje. No suman días de atraso."
        action={newButton}
      />

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {!result && !error && <LoadingSkeleton />}

      {result?.pendingReview > 0 && (
        <Alert severity="info" sx={{ mb: 2 }} action={<Button component={RouterLink} to="/fees/payments" color="inherit" size="small">Revisar</Button>}>
          Hay {result.pendingReview === 1 ? '1 transferencia' : `${result.pendingReview} transferencias`} de cargos por revisar en Pagos.
        </Alert>
      )}

      {result && result.items.length === 0 && (
        <EmptyState
          icon={PostAddRounded}
          title="Todavía no hay cargos"
          description="Creá un cargo para cobrarles algo a todos los socios, a algunos, a una categoría o a un deporte."
        />
      )}

      {result && result.items.length > 0 && (
        <Stack spacing={1.5}>
          {result.items.map((charge) => <ChargeCard key={charge.id} charge={charge} />)}
        </Stack>
      )}

      {creating && (
        <ChargeFormDialog
          onClose={() => setCreating(false)}
          onCreated={(charge) => navigate(`/fees/charges/${charge.id}`, { state: { created: true } })}
        />
      )}
    </>
  )
}
