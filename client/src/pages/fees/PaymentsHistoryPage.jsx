import { useCallback, useEffect, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import Alert from '@mui/material/Alert'
import Badge from '@mui/material/Badge'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardActionArea from '@mui/material/CardActionArea'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import MenuItem from '@mui/material/MenuItem'
import Pagination from '@mui/material/Pagination'
import Paper from '@mui/material/Paper'
import Snackbar from '@mui/material/Snackbar'
import Stack from '@mui/material/Stack'
import Tab from '@mui/material/Tab'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Tabs from '@mui/material/Tabs'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useTheme } from '@mui/material/styles'
import CloseRounded from '@mui/icons-material/CloseRounded'
import ReceiptLongRounded from '@mui/icons-material/ReceiptLongRounded'
import ReceiptRounded from '@mui/icons-material/ReceiptRounded'
import SearchRounded from '@mui/icons-material/SearchRounded'

import { approveTransfer, getPayments, rejectTransfer } from '../../api/fees.api.js'
import EmptyState from '../../components/common/EmptyState.jsx'
import StatusChip from '../../components/common/StatusChip.jsx'
import FeeStateChip from '../../components/fees/FeeStateChip.jsx'
import ReceiptViewer from '../../components/fees/ReceiptViewer.jsx'
import { PAYMENT_CHIPS, PAYMENT_METHOD_LABELS } from '../../components/fees/paymentLabels.js'
import { getErrorMessage } from '../../utils/apiErrors.js'
import { PAYMENT_METHODS, TRANSACTION_STATES } from '../../utils/constants.js'
import { formatDate, formatMoney, formatPeriod, formatShortDateTime } from '../../utils/format.js'

const TABS = { REVIEW: 'review', ALL: 'all' }

const METHOD_OPTIONS = [
  { value: '', label: 'Todos' },
  ...Object.values(PAYMENT_METHODS).map((value) => ({ value: String(value), label: PAYMENT_METHOD_LABELS[value] }))
]

const STATE_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: String(TRANSACTION_STATES.PENDING), label: 'Pendientes' },
  { value: String(TRANSACTION_STATES.APPROVED), label: 'Aprobados' },
  { value: String(TRANSACTION_STATES.REJECTED), label: 'Rechazados' }
]

const REASON_MIN = 10
const REASON_MAX = 300

const emptyFilters = { method: '', state: '', search: '', from: '', to: '', page: 1 }

const isInReview = (payment) => payment.method === PAYMENT_METHODS.TRANSFER && payment.transactionState === TRANSACTION_STATES.PENDING

const MethodChip = ({ method }) => <Chip label={PAYMENT_METHOD_LABELS[method]} size="small" variant="outlined" />

function VoucherButton({ payment }) {
  if (!payment.hasVoucher) return null
  return (
    <Tooltip title="Ver comprobante de pago">
      <IconButton
        component={RouterLink}
        to={`/fees/payments/${payment.id}/voucher`}
        onClick={(event) => event.stopPropagation()}
        color="secondary"
        aria-label={`Ver comprobante de pago ${payment.confirmationCode}`}
      >
        <ReceiptRounded />
      </IconButton>
    </Tooltip>
  )
}

// Panel de revisión de una transferencia: el comprobante adjunto, la cuota y el monto esperado, y aprobar o rechazar
// (con el motivo obligatorio). onDone(message) después de revisarla
function ReviewDrawer({ payment, onClose, onDone }) {
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState('')
  const [sending, setSending] = useState(null)   // 'approve' o 'reject'
  const [error, setError] = useState('')

  const reasonLength = reason.trim().length
  const reasonValid = reasonLength >= REASON_MIN && reasonLength <= REASON_MAX

  const run = async (action) => {
    setSending(action)
    setError('')
    try {
      if (action === 'approve') {
        const { data } = await approveTransfer(payment.id)
        onDone(`Aprobaste la transferencia ${payment.confirmationCode}. La cuota quedó pagada.${data.recovered ? ' El socio recuperó su condición.' : ''}`)
      } else {
        await rejectTransfer(payment.id, reason.trim())
        onDone(`Rechazaste la transferencia ${payment.confirmationCode}. Le avisamos al socio.`)
      }
    } catch (err) {
      setError(getErrorMessage(err))
      setSending(null)
    }
  }

  const amountMatches = payment.amount === payment.fee.total

  return (
    <Drawer anchor="right" open onClose={sending ? undefined : onClose} slotProps={{ paper: { sx: { width: { xs: '100%', sm: 480 } } } }}>
      <Stack direction="row" sx={{ alignItems: 'center', px: 2.5, py: 1.5, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="h6" component="h3" sx={{ color: 'navy.main', flexGrow: 1 }}>Revisar transferencia</Typography>
        <IconButton onClick={onClose} disabled={Boolean(sending)} aria-label="Cerrar"><CloseRounded /></IconButton>
      </Stack>

      <Box sx={{ p: 2.5, overflowY: 'auto', flexGrow: 1 }}>
        <Typography sx={{ fontWeight: 600, color: 'navy.main' }}>{payment.member.name}</Typography>
        <Typography variant="numeric" sx={{ color: 'text.secondary' }}>Nº {payment.member.numMember}</Typography>
        {payment.payer.id !== payment.member.userId && (
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>Informó: {payment.payer.name}</Typography>
        )}

        <Paper variant="outlined" sx={{ p: 2, my: 2 }}>
          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', gap: 1, mb: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 600, color: 'navy.main' }}>Cuota de {formatPeriod(payment.period)}</Typography>
            <FeeStateChip feeState={payment.fee.feeState} />
          </Stack>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Cuota social {formatMoney(payment.fee.socialAmount)} · Cuota deportiva {formatMoney(payment.fee.sportAmount)}
          </Typography>
          <Divider sx={{ my: 1.5 }} />
          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>Monto esperado</Typography>
            <Typography variant="numeric" sx={{ fontSize: '1.8rem', color: 'navy.main', lineHeight: 1 }}>{formatMoney(payment.fee.total)}</Typography>
          </Stack>
          {!amountMatches && (
            <Typography variant="body2" sx={{ color: 'error.main', mt: 0.5 }}>Informado: {formatMoney(payment.amount)}</Typography>
          )}
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
            Informada el {formatShortDateTime(payment.createdAt)} · {payment.confirmationCode}
          </Typography>
        </Paper>

        <Typography variant="subtitle2" sx={{ color: 'navy.main', mb: 1 }}>Comprobante adjunto</Typography>
        <ReceiptViewer paymentId={payment.id} />

        {rejecting && (
          <TextField
            label="Motivo del rechazo"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            multiline
            minRows={3}
            fullWidth
            autoFocus
            error={reasonLength > 0 && !reasonValid}
            helperText={reasonLength > 0 && reasonLength < REASON_MIN
              ? `Escribí al menos ${REASON_MIN} caracteres (${reasonLength}/${REASON_MAX}).`
              : `Le llega al socio en el aviso. ${reasonLength}/${REASON_MAX}`}
            sx={{ mt: 2 }}
            slotProps={{ htmlInput: { maxLength: REASON_MAX } }}
          />
        )}

        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
      </Box>

      <Stack direction="row" sx={{ gap: 1.5, p: 2.5, borderTop: 1, borderColor: 'divider', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
        {rejecting ? (
          <>
            <Button color="secondary" onClick={() => { setRejecting(false); setReason('') }} disabled={Boolean(sending)}>Cancelar</Button>
            <Button variant="contained" color="error" onClick={() => run('reject')} disabled={!reasonValid || sending === 'approve'} loading={sending === 'reject'}>
              Rechazar transferencia
            </Button>
          </>
        ) : (
          <>
            <Button variant="outlined" color="error" onClick={() => setRejecting(true)} disabled={Boolean(sending)}>Rechazar</Button>
            <Button variant="contained" color="primary" onClick={() => run('approve')} loading={sending === 'approve'}>Aprobar</Button>
          </>
        )}
      </Stack>
    </Drawer>
  )
}

// Historial de pagos del Admin (fees.manage): todos los pagos del club, con las transferencias por revisar primero.
// Pestañas: "Transferencias por revisar" (con el contador) y "Todos los pagos" (con filtros). Tocar una transferencia
// Pendiente abre su revisión; los pagos Aprobados tienen su comprobante de pago
export default function PaymentsHistoryPage() {
  const theme = useTheme()
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'))

  const [tab, setTab] = useState(TABS.REVIEW)
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState(emptyFilters)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reviewing, setReviewing] = useState(null)
  const [notice, setNotice] = useState('')

  // La búsqueda se manda cuando se deja de escribir y vuelve a la primera página
  useEffect(() => {
    const timer = setTimeout(() => setFilters((current) => (
      current.search === search.trim() ? current : { ...current, search: search.trim(), page: 1 }
    )), 350)
    return () => clearTimeout(timer)
  }, [search])

  // En "Transferencias por revisar", el medio y el estado son fijos
  const params = tab === TABS.REVIEW
    ? { ...filters, method: PAYMENT_METHODS.TRANSFER, state: TRANSACTION_STATES.PENDING }
    : filters
  const paramsKey = JSON.stringify(params)

  const load = useCallback(() => {
    setLoading(true)
    getPayments(JSON.parse(paramsKey))
      .then(({ data }) => {
        setResult(data)
        setError('')
      })
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false))
  }, [paramsKey])

  useEffect(() => { load() }, [load])

  const setFilter = (field) => (event) => setFilters((current) => ({ ...current, [field]: event.target.value, page: 1 }))

  const changeTab = (event, value) => {
    setTab(value)
    setFilters((current) => ({ ...current, page: 1 }))
  }

  const handleReviewed = (message) => {
    setReviewing(null)
    setNotice(message)
    load()
  }

  const payments = result?.items ?? []
  const hasFilters = Boolean(filters.search || filters.from || filters.to || (tab === TABS.ALL && (filters.method || filters.state)))
  const open = (payment) => isInReview(payment) && setReviewing(payment)

  return (
    <>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h5" component="h2" sx={{ color: 'navy.main' }}>Pagos</Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Todos los pagos del club: con tarjeta, por transferencia y en secretaría. Las transferencias se aprueban después de comparar el comprobante.
        </Typography>
      </Box>

      <Tabs value={tab} onChange={changeTab} textColor="secondary" indicatorColor="secondary" variant="scrollable" allowScrollButtonsMobile sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Tab
          value={TABS.REVIEW}
          label={(
            <Badge badgeContent={result?.pendingReview ?? 0} color="primary" sx={{ '& .MuiBadge-badge': { right: -14 } }}>
              Transferencias por revisar
            </Badge>
          )}
          sx={{ pr: 4 }}
        />
        <Tab value={TABS.ALL} label="Todos los pagos" />
      </Tabs>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 3 }}>
        <TextField
          placeholder="Buscar por socio: nombre, DNI o número"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          size="small"
          sx={{ flexGrow: 1 }}
          slotProps={{
            input: { startAdornment: <InputAdornment position="start"><SearchRounded /></InputAdornment> },
            htmlInput: { maxLength: 100, 'aria-label': 'Buscar pagos' }
          }}
        />
        {tab === TABS.ALL && (
          <Stack direction="row" spacing={2}>
            <TextField select label="Medio" value={filters.method} onChange={setFilter('method')} size="small" sx={{ minWidth: 140, flex: 1 }}>
              {METHOD_OPTIONS.map((option) => <MenuItem key={option.label} value={option.value}>{option.label}</MenuItem>)}
            </TextField>
            <TextField select label="Estado" value={filters.state} onChange={setFilter('state')} size="small" sx={{ minWidth: 140, flex: 1 }}>
              {STATE_OPTIONS.map((option) => <MenuItem key={option.label} value={option.value}>{option.label}</MenuItem>)}
            </TextField>
          </Stack>
        )}
        <Stack direction="row" spacing={2}>
          <TextField type="date" label="Desde" value={filters.from} onChange={setFilter('from')} size="small" sx={{ flex: 1 }} slotProps={{ inputLabel: { shrink: true }, htmlInput: { max: filters.to || undefined } }} />
          <TextField type="date" label="Hasta" value={filters.to} onChange={setFilter('to')} size="small" sx={{ flex: 1 }} slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: filters.from || undefined } }} />
        </Stack>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {!result && loading && <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}><CircularProgress color="secondary" /></Box>}

      {result && payments.length === 0 && (
        hasFilters
          ? <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>No encontramos pagos con esa búsqueda.</Paper>
          : (
            <EmptyState
              icon={ReceiptLongRounded}
              title={tab === TABS.REVIEW ? 'No hay transferencias por revisar' : 'Todavía no hay pagos'}
              description={tab === TABS.REVIEW ? 'Cuando un socio informe una transferencia, aparece acá.' : 'Los pagos de las cuotas aparecen acá.'}
            />
          )
      )}

      {payments.length > 0 && (isDesktop ? (
        <TableContainer component={Paper} variant="outlined" sx={{ opacity: loading ? 0.6 : 1 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Fecha</TableCell>
                <TableCell>Socio</TableCell>
                <TableCell>Período</TableCell>
                <TableCell align="right">Monto</TableCell>
                <TableCell>Medio</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell>Código</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {payments.map((payment) => {
                const chip = PAYMENT_CHIPS[payment.transactionState]
                const reviewable = isInReview(payment)
                return (
                  <TableRow key={payment.id} hover={reviewable} onClick={() => open(payment)} sx={{ cursor: reviewable ? 'pointer' : 'default' }}>
                    <TableCell>{formatDate(payment.createdAt)}</TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500, color: 'navy.main' }}>{payment.member.name}</Typography>
                      <Typography variant="numeric" sx={{ color: 'text.secondary' }}>Nº {payment.member.numMember}</Typography>
                      {payment.payer.id !== payment.member.userId && (
                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                          {payment.method === PAYMENT_METHODS.CASH ? 'Registró' : 'Pagó'}: {payment.payer.name}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>{formatPeriod(payment.period)}</TableCell>
                    <TableCell align="right"><Typography variant="numeric" sx={{ fontSize: '1.2rem' }}>{formatMoney(payment.amount)}</Typography></TableCell>
                    <TableCell><MethodChip method={payment.method} /></TableCell>
                    <TableCell><StatusChip status={chip.status} label={chip.label} /></TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{payment.confirmationCode}</TableCell>
                    <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                      {reviewable
                        ? <Button size="small" color="secondary" onClick={(event) => { event.stopPropagation(); setReviewing(payment) }}>Revisar</Button>
                        : <VoucherButton payment={payment} />}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <Stack spacing={1.5} sx={{ opacity: loading ? 0.6 : 1 }}>
          {payments.map((payment) => {
            const chip = PAYMENT_CHIPS[payment.transactionState]
            const reviewable = isInReview(payment)
            const content = (
              <CardContent>
                <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
                  <Typography sx={{ fontWeight: 600, color: 'navy.main', minWidth: 0 }} noWrap>{payment.member.name}</Typography>
                  <StatusChip status={chip.status} label={chip.label} />
                </Stack>
                <Typography variant="numeric" sx={{ color: 'text.secondary' }}>Nº {payment.member.numMember}</Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {formatPeriod(payment.period)} · {formatDate(payment.createdAt)}
                </Typography>
                <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mt: 1, gap: 1 }}>
                  <Stack direction="row" sx={{ gap: 1, alignItems: 'center', minWidth: 0 }}>
                    <MethodChip method={payment.method} />
                    <Typography variant="caption" sx={{ color: 'text.secondary', overflowWrap: 'anywhere' }}>{payment.confirmationCode}</Typography>
                  </Stack>
                  <Typography variant="numeric" sx={{ fontSize: '1.3rem', color: 'navy.main', flexShrink: 0 }}>{formatMoney(payment.amount)}</Typography>
                </Stack>
              </CardContent>
            )
            return (
              <Card key={payment.id} variant="outlined">
                {reviewable ? <CardActionArea onClick={() => setReviewing(payment)}>{content}</CardActionArea> : content}
                {reviewable && <Box sx={{ px: 1, pb: 1 }}><Button size="small" color="secondary" onClick={() => setReviewing(payment)}>Revisar transferencia</Button></Box>}
                {payment.hasVoucher && (
                  <Box sx={{ px: 1, pb: 1 }}>
                    <Button size="small" color="secondary" component={RouterLink} to={`/fees/payments/${payment.id}/voucher`} startIcon={<ReceiptRounded />}>
                      Comprobante de pago
                    </Button>
                  </Box>
                )}
              </Card>
            )
          })}
        </Stack>
      ))}

      {result && result.totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Pagination
            count={result.totalPages}
            page={filters.page}
            onChange={(event, page) => setFilters((current) => ({ ...current, page }))}
            color="secondary"
          />
        </Box>
      )}

      {reviewing && <ReviewDrawer payment={reviewing} onClose={() => setReviewing(null)} onDone={handleReviewed} />}

      <Snackbar open={Boolean(notice)} autoHideDuration={6000} onClose={() => setNotice('')} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="success" variant="filled" onClose={() => setNotice('')}>{notice}</Alert>
      </Snackbar>
    </>
  )
}
