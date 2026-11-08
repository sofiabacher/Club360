import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardActionArea from '@mui/material/CardActionArea'
import CardContent from '@mui/material/CardContent'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import InputAdornment from '@mui/material/InputAdornment'
import MenuItem from '@mui/material/MenuItem'
import Pagination from '@mui/material/Pagination'
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
import Typography from '@mui/material/Typography'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useTheme } from '@mui/material/styles'
import SearchRounded from '@mui/icons-material/SearchRounded'

import { generateFees, getFees } from '../../api/fees.api.js'
import StatusChip from '../../components/common/StatusChip.jsx'
import FeeStateChip from '../../components/fees/FeeStateChip.jsx'
import RegisterPaymentDialog from '../../components/fees/RegisterPaymentDialog.jsx'
import { getErrorMessage } from '../../utils/apiErrors.js'
import { FEE_STATES } from '../../utils/constants.js'
import { formatDayMonth, formatMoney, formatPeriod } from '../../utils/format.js'

const STATE_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: String(FEE_STATES.PENDING), label: 'Pendientes' },
  { value: String(FEE_STATES.OVERDUE), label: 'Vencidas' },
  { value: String(FEE_STATES.PAID), label: 'Pagadas' }
]

// Período actual en Argentina: '2026-11'
const currentPeriod = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date()).slice(0, 7)

function SummaryCard({ label, status, data }) {
  return (
    <Card sx={{ flex: 1, minWidth: 0 }}>
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <StatusChip status={status} label={label} />
        <Typography variant="numeric" component="p" sx={{ fontSize: '2rem', color: 'navy.main', mt: 1, lineHeight: 1.1 }}>{data?.count ?? 0}</Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>{formatMoney(data?.amount ?? 0)}</Typography>
      </CardContent>
    </Card>
  )
}

const dueText = (fee) => (fee.overdueDays > 0 ? `${fee.overdueDays} días de atraso` : `Vence el ${formatDayMonth(fee.expirationDate)}`)

// Gestión de cuotas del Admin (fees.manage): resumen del período, generación a mano, listado con filtros y pago en
// secretaría. Tocar un socio abre su estado de cuenta
export default function FeesPage() {
  const theme = useTheme()
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'))
  const navigate = useNavigate()

  const [search, setSearch] = useState('')
  const [query, setQuery] = useState({ period: currentPeriod(), state: '', search: '', page: 1 })   // Lo que se pidió al back
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [confirmGenerate, setConfirmGenerate] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [registering, setRegistering] = useState(null)   // { fee, memberName }
  const [notice, setNotice] = useState({ open: false, severity: 'success', message: '' })
  const closeNotice = () => setNotice((current) => ({ ...current, open: false }))

  // La búsqueda se manda cuando se deja de escribir y vuelve a la primera página
  useEffect(() => {
    const timer = setTimeout(() => setQuery((current) => (
      current.search === search.trim() ? current : { ...current, search: search.trim(), page: 1 }
    )), 350)

    return () => clearTimeout(timer)
  }, [search])

  const load = useCallback(() => {
    setLoading(true)
    getFees(query)
      .then(({ data }) => {
        setResult(data)
        setError('')
      })
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false))
  }, [query])

  useEffect(() => { load() }, [load])

  const setFilter = (field) => (event) => setQuery((current) => ({ ...current, [field]: event.target.value, page: 1 }))

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      const { data } = await generateFees(query.period)
      const created = data.created === 1 ? 'Se generó 1 cuota' : `Se generaron ${data.created} cuotas`
      setNotice({ open: true, severity: 'success', message: `${created} · ${data.existing} ya ${data.existing === 1 ? 'existía' : 'existían'}` })
      load()
    } catch (err) {
      setNotice({ open: true, severity: 'error', message: getErrorMessage(err) })
    } finally {
      setGenerating(false)
      setConfirmGenerate(false)
    }
  }

  const handleRegistered = (data) => {
    setRegistering(null)
    setNotice({ open: true, severity: 'success', message: `Pago registrado (${data.payment.confirmationCode}).${data.recovered ? ' El socio recuperó su condición.' : ''}` })
    load()
  }

  const fees = result?.items ?? []
  const month = formatPeriod(query.period)
  const isFuture = query.period > currentPeriod()
  const openMember = (memberId) => navigate(`/fees/members/${memberId}`)

  const registerButton = (fee) => fee.feeState !== FEE_STATES.PAID && (
    <Button
      size="small"
      color="secondary"
      onClick={(event) => {
        event.stopPropagation()
        setRegistering({ fee, memberName: fee.member.name })
      }}
    >
      Registrar pago en secretaría
    </Button>
  )

  return (
    <>
      <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between', gap: 2, mb: 3 }}>
        <Box>
          <Typography variant="h5" component="h2" sx={{ color: 'navy.main' }}>Cuotas</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>Se generan el día 1 de cada mes y vencen el 10.</Typography>
        </Box>
        <Stack direction="row" sx={{ gap: 2, alignItems: 'center' }}>
          <TextField
            type="month"
            label="Período"
            value={query.period}
            onChange={(event) => event.target.value && setFilter('period')(event)}
            size="small"
            sx={{ minWidth: 170, flexGrow: { xs: 1, sm: 0 } }}
            slotProps={{ inputLabel: { shrink: true }, htmlInput: { max: currentPeriod() } }}
          />
          <Button variant="contained" color="primary" onClick={() => setConfirmGenerate(true)} disabled={isFuture} sx={{ flexShrink: 0 }}>
            Generar cuotas de {month.split(' ')[0].toLowerCase()}
          </Button>
        </Stack>
      </Stack>

      <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ gap: 2, mb: 3 }}>
        <SummaryCard label="Pagadas" status="ok" data={result?.summary.paid} />
        <SummaryCard label="Pendientes" status="pending" data={result?.summary.pending} />
        <SummaryCard label="Vencidas" status="overdue" data={result?.summary.overdue} />
      </Stack>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
        <TextField
          placeholder="Buscar por nombre, DNI o número de socio"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          size="small"
          sx={{ flexGrow: 1 }}
          slotProps={{
            input: { startAdornment: <InputAdornment position="start"><SearchRounded /></InputAdornment> },
            htmlInput: { maxLength: 100, 'aria-label': 'Buscar cuotas' }
          }}
        />
        <TextField select label="Estado" value={query.state} onChange={setFilter('state')} size="small" sx={{ minWidth: 180 }}>
          {STATE_OPTIONS.map((option) => <MenuItem key={option.label} value={option.value}>{option.label}</MenuItem>)}
        </TextField>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {!result && loading && (
        <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}><CircularProgress color="secondary" /></Box>
      )}

      {result && fees.length === 0 && (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
          {query.search || query.state ? 'No encontramos cuotas con esa búsqueda.' : `Todavía no hay cuotas de ${month.toLowerCase()}.`}
        </Paper>
      )}

      {fees.length > 0 && (isDesktop ? (
        <TableContainer component={Paper} variant="outlined" sx={{ opacity: loading ? 0.6 : 1 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Socio</TableCell>
                <TableCell>Desglose</TableCell>
                <TableCell align="right">Total</TableCell>
                <TableCell>Vencimiento</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {fees.map((fee) => (
                <TableRow key={fee.id} hover onClick={() => openMember(fee.member.id)} sx={{ cursor: 'pointer' }}>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 500, color: 'navy.main' }}>{fee.member.name}</Typography>
                    <Typography variant="numeric" sx={{ color: 'text.secondary' }}>Nº {fee.member.numMember}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">Social {formatMoney(fee.socialAmount)}</Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>Deportiva {formatMoney(fee.sportAmount)}</Typography>
                  </TableCell>
                  <TableCell align="right"><Typography variant="numeric" sx={{ fontSize: '1.2rem' }}>{formatMoney(fee.total)}</Typography></TableCell>
                  <TableCell>{fee.feeState === FEE_STATES.PAID ? formatDayMonth(fee.expirationDate) : dueText(fee)}</TableCell>
                  <TableCell><FeeStateChip feeState={fee.feeState} /></TableCell>
                  <TableCell align="right">{registerButton(fee)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <Stack spacing={1.5} sx={{ opacity: loading ? 0.6 : 1 }}>
          {fees.map((fee) => (
            <Card key={fee.id} variant="outlined">
              <CardActionArea onClick={() => openMember(fee.member.id)}>
                <CardContent>
                  <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
                    <Typography sx={{ fontWeight: 600, color: 'navy.main', minWidth: 0 }} noWrap>{fee.member.name}</Typography>
                    <FeeStateChip feeState={fee.feeState} />
                  </Stack>
                  <Typography variant="numeric" sx={{ color: 'text.secondary' }}>Nº {fee.member.numMember}</Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    Social {formatMoney(fee.socialAmount)} · Deportiva {formatMoney(fee.sportAmount)}
                  </Typography>
                  <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'baseline', mt: 0.5 }}>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>{fee.feeState === FEE_STATES.PAID ? 'Pagada' : dueText(fee)}</Typography>
                    <Typography variant="numeric" sx={{ fontSize: '1.3rem', color: 'navy.main' }}>{formatMoney(fee.total)}</Typography>
                  </Stack>
                </CardContent>
              </CardActionArea>
              {fee.feeState !== FEE_STATES.PAID && <Box sx={{ px: 1, pb: 1 }}>{registerButton(fee)}</Box>}
            </Card>
          ))}
        </Stack>
      ))}

      {result && result.totalPages > 1 && (
        <Stack sx={{ alignItems: 'center', mt: 3 }}>
          <Pagination count={result.totalPages} page={result.page} onChange={(event, page) => setQuery((current) => ({ ...current, page }))} color="secondary" />
        </Stack>
      )}

      <Dialog open={confirmGenerate} onClose={generating ? undefined : () => setConfirmGenerate(false)} fullWidth maxWidth="xs">
        <DialogTitle>¿Generar las cuotas de {month}?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Se genera la cuota a los socios activos y suspendidos dados de alta antes del día 1, con la cuota social y la
            deportiva de hoy. Vencen el 10. Las que ya existen no se tocan.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button color="secondary" onClick={() => setConfirmGenerate(false)} disabled={generating}>Volver</Button>
          <Button variant="contained" color="secondary" onClick={handleGenerate} loading={generating}>Generar</Button>
        </DialogActions>
      </Dialog>

      {registering && (
        <RegisterPaymentDialog fee={registering.fee} memberName={registering.memberName} onClose={() => setRegistering(null)} onDone={handleRegistered} />
      )}

      <Snackbar open={notice.open} autoHideDuration={6000} onClose={closeNotice} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={notice.severity} variant="filled" onClose={closeNotice}>{notice.message}</Alert>
      </Snackbar>
    </>
  )
}
