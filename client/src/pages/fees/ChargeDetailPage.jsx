import { useCallback, useEffect, useState } from 'react'
import { Link as RouterLink, useLocation, useParams } from 'react-router-dom'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import MenuItem from '@mui/material/MenuItem'
import Paper from '@mui/material/Paper'
import Snackbar from '@mui/material/Snackbar'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useTheme } from '@mui/material/styles'
import ArrowBackRounded from '@mui/icons-material/ArrowBackRounded'
import ReceiptRounded from '@mui/icons-material/ReceiptRounded'
import SearchRounded from '@mui/icons-material/SearchRounded'

import { cancelCharge, cancelChargeItem, getCharge } from '../../api/fees.api.js'
import ChargeStateChip from '../../components/fees/ChargeStateChip.jsx'
import RegisterPaymentDialog from '../../components/fees/RegisterPaymentDialog.jsx'
import { PAYMENT_METHOD_LABELS } from '../../components/fees/paymentLabels.js'
import LoadingSkeleton from '../../components/common/LoadingSkeleton.jsx'
import StatusChip from '../../components/common/StatusChip.jsx'
import { getErrorMessage } from '../../utils/apiErrors.js'
import { CHARGE_STATES } from '../../utils/constants.js'
import { formatDate, formatDayMonth, formatMoney } from '../../utils/format.js'

const STATE_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: String(CHARGE_STATES.PENDING), label: 'Pendientes' },
  { value: String(CHARGE_STATES.OVERDUE), label: 'Vencidos' },
  { value: String(CHARGE_STATES.PAID), label: 'Pagados' },
  { value: String(CHARGE_STATES.CANCELLED), label: 'Anulados' }
]

const isUnpaid = (item) => item.chargeState === CHARGE_STATES.PENDING || item.chargeState === CHARGE_STATES.OVERDUE

function Stat({ label, status, value }) {
  return (
    <Card sx={{ flex: 1, minWidth: 0 }}>
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <StatusChip status={status} label={label} />
        <Typography variant="numeric" component="p" sx={{ fontSize: '2rem', color: 'navy.main', mt: 1, lineHeight: 1.1 }}>{value}</Typography>
      </CardContent>
    </Card>
  )
}

// Acciones de un socio: registrar el pago o anular (impagos), revisar la transferencia o ver el comprobante (pagados)
function ItemActions({ item, active, onRegister, onCancel }) {
  if (item.inReview) {
    return <Button component={RouterLink} to="/fees/payments" size="small" color="secondary">Revisar transferencia</Button>
  }
  if (item.payment) {
    return (
      <Tooltip title="Ver comprobante de pago">
        <IconButton component={RouterLink} to={`/fees/payments/${item.payment.id}/voucher`} color="secondary" aria-label={`Ver comprobante de pago de ${item.member.name}`}>
          <ReceiptRounded />
        </IconButton>
      </Tooltip>
    )
  }
  if (!isUnpaid(item) || !active) return null
  return (
    <Stack direction="row" sx={{ gap: 0.5, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
      <Button size="small" color="secondary" onClick={() => onRegister(item)}>Registrar pago</Button>
      <Button size="small" color="error" onClick={() => onCancel(item)}>Anular</Button>
    </Stack>
  )
}

// Estado de un socio: el chip, y abajo los días desde el vencimiento o cómo pagó
function ItemStatus({ item }) {
  return (
    <>
      <ChargeStateChip chargeState={item.chargeState} />
      {item.inReview && <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}>Transferencia en revisión</Typography>}
      {!item.inReview && item.overdueDays > 0 && (
        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}>Hace {item.overdueDays} {item.overdueDays === 1 ? 'día' : 'días'}</Typography>
      )}
      {item.payment && (
        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}>
          {PAYMENT_METHOD_LABELS[item.payment.method]} · {formatDate(item.payment.approvedAt)}
        </Typography>
      )}
    </>
  )
}

// Detalle de un cargo eventual (fees.manage): el resumen y cada socio con su estado. Desde acá se registra un pago en
// secretaría, se anula el cargo de un socio o el cargo entero (los pagados quedan como están)
export default function ChargeDetailPage() {
  const { id } = useParams()
  const location = useLocation()
  const theme = useTheme()
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'))

  const [charge, setCharge] = useState(null)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [state, setState] = useState('')
  const [registering, setRegistering] = useState(null)   // item
  const [confirm, setConfirm] = useState(null)   // { item } para anular uno, o { all: true }
  const [cancelling, setCancelling] = useState(false)
  const [cancelError, setCancelError] = useState('')
  const [notice, setNotice] = useState(location.state?.created ? 'Cargo creado. Les avisamos a los socios por la app y por email.' : '')

  const load = useCallback(() => {
    getCharge(id)
      .then(({ data }) => setCharge(data))
      .catch((err) => setError(getErrorMessage(err)))
  }, [id])

  useEffect(() => { load() }, [load])

  const handleRegistered = (data) => {
    setRegistering(null)
    setNotice(`Pago registrado (${data.payment.confirmationCode}).`)
    load()
  }

  const handleCancel = async () => {
    setCancelling(true)
    setCancelError('')
    try {
      const { data } = confirm.all ? await cancelCharge(charge.id) : await cancelChargeItem(confirm.item.id)
      setCharge(data)
      setNotice(confirm.all ? 'Cargo anulado. Les avisamos a los socios que no lo habían pagado.' : `Anulaste el cargo de ${confirm.item.member.name}.`)
      setConfirm(null)
    } catch (err) {
      setCancelError(getErrorMessage(err))
    } finally {
      setCancelling(false)
    }
  }

  const backButton = <Button component={RouterLink} to="/fees/charges" startIcon={<ArrowBackRounded />} color="secondary" sx={{ mb: 2 }}>Cargos eventuales</Button>

  if (error) return <>{backButton}<Alert severity="error">{error}</Alert></>
  if (!charge) return <LoadingSkeleton />

  const words = search.trim().toLowerCase().split(/\s+/).filter(Boolean)
  const items = charge.items
    .filter((item) => !state || item.chargeState === Number(state))
    .filter((item) => words.every((word) => `${item.member.name} ${item.member.numMember}`.toLowerCase().includes(word)))
  const unpaidCount = charge.counts.pending + charge.counts.overdue

  const actions = (item) => (
    <ItemActions item={item} active={charge.isActive} onRegister={setRegistering} onCancel={(target) => { setCancelError(''); setConfirm({ item: target }) }} />
  )

  return (
    <>
      {backButton}

      <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ gap: 2, justifyContent: 'space-between', alignItems: { sm: 'flex-start' }, mb: 3 }}>
        <Box sx={{ minWidth: 0 }}>
          <Stack direction="row" sx={{ alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Typography variant="h5" component="h2" sx={{ color: 'navy.main', overflowWrap: 'anywhere' }}>{charge.concept}</Typography>
            {!charge.isActive && <StatusChip status="neutral" label="Anulado" />}
          </Stack>
          {charge.description && <Typography variant="body2" sx={{ color: 'text.secondary', overflowWrap: 'anywhere' }}>{charge.description}</Typography>}
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5, overflowWrap: 'anywhere' }}>
            {formatMoney(charge.amount)} por socio · Vence el {formatDayMonth(charge.expirationDate)} · {charge.targetLabel}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Creado el {formatDate(charge.createdAt)}{charge.author ? ` por ${charge.author}` : ''}
          </Typography>
        </Box>
        {charge.isActive && unpaidCount > 0 && (
          <Button variant="outlined" color="error" onClick={() => { setCancelError(''); setConfirm({ all: true }) }} sx={{ flexShrink: 0 }}>Anular cargo</Button>
        )}
      </Stack>

      <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ gap: 2, mb: 3 }}>
        <Stat label="Pagados" status="ok" value={charge.counts.paid} />
        <Stat label="Pendientes" status="pending" value={charge.counts.pending} />
        <Stat label="Vencidos" status="overdue" value={charge.counts.overdue} />
        <Card sx={{ flex: 1.3, minWidth: 0 }}>
          <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>Cobrado</Typography>
            <Typography variant="numeric" component="p" sx={{ fontSize: '2rem', color: 'navy.main', lineHeight: 1.1 }}>{formatMoney(charge.collected)}</Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>Falta cobrar {formatMoney(charge.due)}</Typography>
          </CardContent>
        </Card>
      </Stack>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <TextField
          placeholder="Buscar por nombre o número de socio"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          size="small"
          sx={{ flexGrow: 1 }}
          slotProps={{
            input: { startAdornment: <InputAdornment position="start"><SearchRounded /></InputAdornment> },
            htmlInput: { maxLength: 100, 'aria-label': 'Buscar socios del cargo' }
          }}
        />
        <TextField select label="Estado" value={state} onChange={(event) => setState(event.target.value)} size="small" sx={{ minWidth: 180 }}>
          {STATE_OPTIONS.map((option) => <MenuItem key={option.label} value={option.value}>{option.label}</MenuItem>)}
        </TextField>
      </Stack>

      {items.length === 0 && (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>No hay socios con ese filtro.</Paper>
      )}

      {items.length > 0 && (isDesktop ? (
        <TableContainer component={Paper} variant="outlined">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Socio</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id} hover>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 500, color: 'navy.main' }}>
                      <Box component={RouterLink} to={`/fees/members/${item.member.id}`} sx={{ color: 'inherit', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>{item.member.name}</Box>
                    </Typography>
                    <Typography variant="numeric" sx={{ color: 'text.secondary' }}>Nº {item.member.numMember}</Typography>
                  </TableCell>
                  <TableCell><ItemStatus item={item} /></TableCell>
                  <TableCell align="right">{actions(item)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <Stack spacing={1.5}>
          {items.map((item) => (
            <Card key={item.id}>
              <CardContent sx={{ '&:last-child': { pb: 1.5 } }}>
                <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 600, color: 'navy.main' }} noWrap>{item.member.name}</Typography>
                    <Typography variant="numeric" sx={{ color: 'text.secondary' }}>Nº {item.member.numMember}</Typography>
                  </Box>
                  <Box sx={{ textAlign: 'right', flexShrink: 0 }}><ItemStatus item={item} /></Box>
                </Stack>
                <Box sx={{ mt: 1, display: 'flex', justifyContent: 'flex-end' }}>{actions(item)}</Box>
              </CardContent>
            </Card>
          ))}
        </Stack>
      ))}

      {registering && (
        <RegisterPaymentDialog
          fee={{ id: registering.id, kind: 'charge', concept: charge.concept, total: charge.amount }}
          memberName={registering.member.name}
          onClose={() => setRegistering(null)}
          onDone={handleRegistered}
        />
      )}

      <Dialog open={Boolean(confirm)} onClose={cancelling ? undefined : () => setConfirm(null)} fullWidth maxWidth="xs">
        <DialogTitle>{confirm?.all ? `¿Anular «${charge.concept}»?` : '¿Anular el cargo de este socio?'}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {confirm?.all
              ? `Se anula para los ${unpaidCount} ${unpaidCount === 1 ? 'socio que no lo pagó' : 'socios que no lo pagaron'} y les avisamos. Los pagos ya hechos quedan como están. No se puede deshacer.`
              : `${confirm?.item?.member.name} ya no va a tener que pagar «${charge.concept}». Le avisamos. No se puede deshacer.`}
          </DialogContentText>
          {cancelError && <Alert severity="error" sx={{ mt: 2 }}>{cancelError}</Alert>}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button color="secondary" onClick={() => setConfirm(null)} disabled={cancelling}>Volver</Button>
          <Button variant="contained" color="error" onClick={handleCancel} loading={cancelling}>Anular</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={Boolean(notice)} autoHideDuration={6000} onClose={() => setNotice('')} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="success" variant="filled" onClose={() => setNotice('')}>{notice}</Alert>
      </Snackbar>
    </>
  )
}
