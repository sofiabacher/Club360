import { useCallback, useEffect, useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import ButtonBase from '@mui/material/ButtonBase'
import Card from '@mui/material/Card'
import CardActionArea from '@mui/material/CardActionArea'
import CardContent from '@mui/material/CardContent'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Grid from '@mui/material/Grid'
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
import DownloadRounded from '@mui/icons-material/DownloadRounded'
import FilterAltOffRounded from '@mui/icons-material/FilterAltOffRounded'
import HistoryRounded from '@mui/icons-material/HistoryRounded'
import SearchRounded from '@mui/icons-material/SearchRounded'

import { exportLogs, getLogFilters, getLogs } from '../../api/logs.api.js'
import EmptyState from '../../components/common/EmptyState.jsx'
import StatusChip from '../../components/common/StatusChip.jsx'
import usePermission from '../../hooks/usePermission.js'
import { getErrorMessage } from '../../utils/apiErrors.js'
import { CRITICITY_CHIPS, CRITICITY_LABELS } from '../../utils/constants.js'
import { saveBlob } from '../../utils/download.js'
import { formatDate, formatTime } from '../../utils/format.js'

const emptyFilters = { from: '', to: '', criticity: '', action: '', userId: '', search: '', page: 1 }

const DETAIL_PREVIEW = 90

const CriticityChip = ({ criticity }) => <StatusChip status={CRITICITY_CHIPS[criticity]} label={CRITICITY_LABELS[criticity]} />

// "Nombre Apellido (usuario)", "Sistema" si lo hizo un proceso automático
const userText = (log) => (log.user ? `${log.user.name} ${log.user.lastName}`.trim() + (log.user.username ? ` (${log.user.username})` : '') : 'Sistema')

const preview = (text) => (text && text.length > DETAIL_PREVIEW ? `${text.slice(0, DETAIL_PREVIEW)}…` : text ?? '')

function SummaryCard({ criticity, count }) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <CriticityChip criticity={criticity} />
        <Typography variant="numeric" component="p" sx={{ fontSize: '2rem', color: 'navy.main', mt: 1, lineHeight: 1.1 }}>{count ?? 0}</Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>registros</Typography>
      </CardContent>
    </Card>
  )
}

// Bitácora del club (logs.view): cantidad por criticidad del filtro, filtros (fechas, criticidad, acción, usuario y
// búsqueda), la tabla (tarjetas en el celular) con el detalle completo al tocarlo y la descarga en CSV (logs.export)
export default function LogsPage() {
  const theme = useTheme()
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'))
  const { hasPermission } = usePermission()

  const [options, setOptions] = useState({ actions: [], users: [] })
  const [filters, setFilters] = useState(emptyFilters)
  const [search, setSearch] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [detail, setDetail] = useState(null)
  const [downloading, setDownloading] = useState(false)
  const [notice, setNotice] = useState({ open: false, severity: 'success', message: '' })
  const closeNotice = () => setNotice((current) => ({ ...current, open: false }))

  useEffect(() => {
    getLogFilters().then(({ data }) => setOptions(data)).catch(() => {})
  }, [])

  // La búsqueda se manda cuando se deja de escribir y vuelve a la primera página
  useEffect(() => {
    const timer = setTimeout(() => setFilters((current) => (current.search === search.trim() ? current : { ...current, search: search.trim(), page: 1 })), 350)
    return () => clearTimeout(timer)
  }, [search])

  const load = useCallback(() => {
    setLoading(true)
    getLogs(filters)
      .then(({ data }) => {
        setResult(data)
        setError('')
      })
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false))
  }, [filters])

  useEffect(() => { load() }, [load])

  const setFilter = (field) => (event) => setFilters((current) => ({ ...current, [field]: event.target.value, page: 1 }))

  const clearFilters = () => {
    setSearch('')
    setFilters(emptyFilters)
  }

  const handleDownload = async () => {
    setDownloading(true)
    try {
      const { blob, fileName } = await exportLogs({ ...filters, page: undefined })
      saveBlob(blob, fileName)
      setNotice({ open: true, severity: 'success', message: 'Bitácora descargada correctamente.' })
    } catch (err) {
      setNotice({ open: true, severity: 'error', message: getErrorMessage(err) })
    } finally {
      setDownloading(false)
    }
  }

  const logs = result?.items ?? []
  const hasFilters = Object.entries(filters).some(([key, value]) => key !== 'page' && value)
  const rangeInvalid = filters.from && filters.to && filters.from > filters.to

  return (
    <>
      <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' }, gap: 2, mb: 3 }}>
        <Box>
          <Typography variant="h5" component="h2" sx={{ color: 'navy.main' }}>Bitácora</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>Lo que pasó en el club, del más nuevo al más viejo.</Typography>
        </Box>
        {hasPermission('logs.export') && (
          <Button variant="contained" color="secondary" startIcon={<DownloadRounded />} onClick={handleDownload} loading={downloading} disabled={Boolean(rangeInvalid)}>
            Descargar CSV
          </Button>
        )}
      </Stack>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {Object.keys(CRITICITY_LABELS).map((criticity) => (
          <Grid key={criticity} size={{ xs: 6, md: 3 }}>
            <SummaryCard criticity={criticity} count={result?.byCriticity?.[criticity]} />
          </Grid>
        ))}
      </Grid>

      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 6, md: 2 }}>
            <TextField type="date" label="Desde" value={filters.from} onChange={setFilter('from')} size="small" fullWidth slotProps={{ inputLabel: { shrink: true } }} />
          </Grid>
          <Grid size={{ xs: 6, md: 2 }}>
            <TextField
              type="date"
              label="Hasta"
              value={filters.to}
              onChange={setFilter('to')}
              size="small"
              fullWidth
              error={Boolean(rangeInvalid)}
              helperText={rangeInvalid ? 'El rango de fechas no es válido.' : undefined}
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4, md: 2 }}>
            <TextField select label="Criticidad" value={filters.criticity} onChange={setFilter('criticity')} size="small" fullWidth>
              <MenuItem value="">Todas</MenuItem>
              {Object.entries(CRITICITY_LABELS).map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, sm: 8, md: 3 }}>
            <TextField select label="Acción" value={filters.action} onChange={setFilter('action')} size="small" fullWidth>
              <MenuItem value="">Todas</MenuItem>
              {options.actions.map((action) => <MenuItem key={action} value={action}>{action}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <TextField select label="Usuario" value={filters.userId} onChange={setFilter('userId')} size="small" fullWidth>
              <MenuItem value="">Todos</MenuItem>
              {options.users.map((user) => <MenuItem key={user.id} value={String(user.id)}>{user.lastName}, {user.name} ({user.username})</MenuItem>)}
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, md: 9 }}>
            <TextField
              placeholder="Buscar en el detalle o por usuario"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              size="small"
              fullWidth
              slotProps={{
                input: { startAdornment: <InputAdornment position="start"><SearchRounded /></InputAdornment> },
                htmlInput: { maxLength: 100, 'aria-label': 'Buscar en la bitácora' }
              }}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <Button color="secondary" startIcon={<FilterAltOffRounded />} onClick={clearFilters} disabled={!hasFilters && !search} fullWidth>
              Limpiar filtros
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {!result && loading && <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}><CircularProgress color="secondary" /></Box>}

      {result && logs.length === 0 && (
        <EmptyState icon={HistoryRounded} title="Sin registros" description="No hay registros para este filtro." />
      )}

      {logs.length > 0 && (isDesktop ? (
        <TableContainer component={Paper} variant="outlined" sx={{ opacity: loading ? 0.6 : 1 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Fecha y hora</TableCell>
                <TableCell>Usuario</TableCell>
                <TableCell>Rol</TableCell>
                <TableCell>Acción</TableCell>
                <TableCell>Detalle</TableCell>
                <TableCell>Criticidad</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id} hover>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDate(log.createdAt)} {formatTime(log.createdAt)}</TableCell>
                  <TableCell sx={{ overflowWrap: 'anywhere' }}>{userText(log)}</TableCell>
                  <TableCell>{log.role ?? '—'}</TableCell>
                  <TableCell>{log.action}</TableCell>
                  <TableCell sx={{ maxWidth: 360 }}>
                    {log.details ? (
                      <ButtonBase onClick={() => setDetail(log)} sx={{ textAlign: 'left', display: 'block', borderRadius: 1, color: 'text.secondary', overflowWrap: 'anywhere' }}>
                        {preview(log.details)}
                      </ButtonBase>
                    ) : '—'}
                  </TableCell>
                  <TableCell><CriticityChip criticity={log.criticity} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <Stack spacing={1.5} sx={{ opacity: loading ? 0.6 : 1 }}>
          {logs.map((log) => (
            <Card key={log.id} variant="outlined">
              <CardActionArea onClick={() => setDetail(log)}>
                <CardContent>
                  <Stack direction="row" sx={{ justifyContent: 'space-between', gap: 1, alignItems: 'center' }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'navy.main' }}>{log.action}</Typography>
                    <CriticityChip criticity={log.criticity} />
                  </Stack>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {formatDate(log.createdAt)} {formatTime(log.createdAt)} · {userText(log)}{log.role ? ` · ${log.role}` : ''}
                  </Typography>
                  {log.details && <Typography variant="body2" sx={{ mt: 0.5, overflowWrap: 'anywhere' }}>{preview(log.details)}</Typography>}
                </CardContent>
              </CardActionArea>
            </Card>
          ))}
        </Stack>
      ))}

      {result && result.totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Pagination count={result.totalPages} page={filters.page} onChange={(event, page) => setFilters((current) => ({ ...current, page }))} color="secondary" />
        </Box>
      )}

      <Dialog open={Boolean(detail)} onClose={() => setDetail(null)} fullWidth maxWidth="sm">
        {detail && (
          <>
            <DialogTitle>{detail.action}</DialogTitle>
            <DialogContent>
              <Stack direction="row" sx={{ gap: 1, alignItems: 'center', mb: 1.5, flexWrap: 'wrap' }}>
                <CriticityChip criticity={detail.criticity} />
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {formatDate(detail.createdAt)} {formatTime(detail.createdAt)} · {userText(detail)}{detail.role ? ` · ${detail.role}` : ''}
                </Typography>
              </Stack>
              <Typography sx={{ whiteSpace: 'pre-line', overflowWrap: 'anywhere' }}>{detail.details || 'Sin detalle.'}</Typography>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
              <Button color="secondary" onClick={() => setDetail(null)}>Cerrar</Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      <Snackbar open={notice.open} autoHideDuration={5000} onClose={closeNotice} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={notice.severity} variant="filled" onClose={closeNotice}>{notice.message}</Alert>
      </Snackbar>
    </>
  )
}
