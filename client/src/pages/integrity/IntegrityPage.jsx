import { Fragment, useEffect, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CircularProgress from '@mui/material/CircularProgress'
import Collapse from '@mui/material/Collapse'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import IconButton from '@mui/material/IconButton'
import Link from '@mui/material/Link'
import Paper from '@mui/material/Paper'
import Snackbar from '@mui/material/Snackbar'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import ErrorRounded from '@mui/icons-material/ErrorRounded'
import ExpandLessRounded from '@mui/icons-material/ExpandLessRounded'
import ExpandMoreRounded from '@mui/icons-material/ExpandMoreRounded'
import VerifiedUserRounded from '@mui/icons-material/VerifiedUserRounded'

import { downloadIntegrityReport, repairIntegrity, verifyIntegrity } from '../../api/integrity.api.js'
import StatusChip from '../../components/common/StatusChip.jsx'
import { getErrorMessage } from '../../utils/apiErrors.js'
import { saveBlob } from '../../utils/download.js'
import { formatDateTimeLong } from '../../utils/format.js'

const hasErrors = (table) => table.errors.length > 0 || !table.dvvOk

// Tarjeta grande del estado: verde si está todo bien, roja con la cantidad de registros alterados
function StatusCard({ report }) {
  const ok = report.status === 'OK'
  return (
    <Card sx={(theme) => ({ bgcolor: ok ? theme.status.ok.bg : theme.status.overdue.bg, border: 1, borderColor: ok ? theme.status.ok.fg : theme.status.overdue.fg })}>
      <CardContent sx={{ p: { xs: 2.5, sm: 3 }, display: 'flex', gap: 2, alignItems: 'center' }}>
        {ok
          ? <VerifiedUserRounded sx={(theme) => ({ fontSize: 56, color: theme.status.ok.fg })} />
          : <ErrorRounded sx={(theme) => ({ fontSize: 56, color: theme.status.overdue.fg })} />}
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h6" component="p" sx={(theme) => ({ color: ok ? theme.status.ok.fg : theme.status.overdue.fg })}>
            {ok ? 'Los datos del club están íntegros' : `Se detectaron ${report.alteredRows} registros alterados${report.tables.some((table) => !table.dvvOk) ? ' (y tablas con el DVV distinto)' : ''}`}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {ok ? 'Última verificación' : 'Los demás usuarios no pueden entrar hasta que se reparen. Verificado'}: {formatDateTimeLong(report.checkedAt)}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  )
}

// Integridad de los datos (integrity.manage): verificación de DVH y DVV del club, tabla por tabla, reparación por tabla
// o de todo (con confirmación) y descarga del informe
export default function IntegrityPage() {
  const [report, setReport] = useState(null)
  const [verifying, setVerifying] = useState(true)
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState(null)
  const [repairing, setRepairing] = useState(null)   // { tables: [...] | null (todas), label }
  const [sending, setSending] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [notice, setNotice] = useState({ open: false, severity: 'success', message: '' })
  const closeNotice = () => setNotice((current) => ({ ...current, open: false }))

  const verify = () => {
    setVerifying(true)
    verifyIntegrity()
      .then(({ data }) => {
        setReport(data)
        setError('')
      })
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setVerifying(false))
  }

  useEffect(() => { verify() }, [])

  const handleRepair = async () => {
    setSending(true)
    try {
      const { data } = await repairIntegrity(repairing.tables)
      setReport(data)
      setRepairing(null)
      setNotice({
        open: true,
        severity: data.status === 'OK' ? 'success' : 'warning',
        message: data.status === 'OK' ? 'Reparado. El club se desbloqueó.' : 'Reparado, pero quedan tablas con errores.'
      })
    } catch (err) {
      setNotice({ open: true, severity: 'error', message: getErrorMessage(err) })
    } finally {
      setSending(false)
    }
  }

  const handleDownload = async () => {
    setDownloading(true)
    try {
      const { blob, fileName } = await downloadIntegrityReport()
      saveBlob(blob, fileName)
    } catch (err) {
      setNotice({ open: true, severity: 'error', message: getErrorMessage(err) })
    } finally {
      setDownloading(false)
    }
  }

  const withErrors = report?.tables.filter(hasErrors) ?? []

  return (
    <>
      <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' }, gap: 2, mb: 3 }}>
        <Box>
          <Typography variant="h5" component="h2" sx={{ color: 'navy.main' }}>Integridad de datos</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Se revisan los dígitos verificadores de cada registro (DVH) y de cada tabla (DVV). Se verifica sola todas las noches.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.5} sx={{ flexShrink: 0 }}>
          <Button variant="contained" color="primary" onClick={verify} loading={verifying}>Verificar ahora</Button>
          <Button variant="outlined" color="secondary" onClick={handleDownload} loading={downloading} disabled={!report}>Descargar informe</Button>
        </Stack>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {!report && verifying && <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}><CircularProgress color="secondary" /></Box>}

      {report && (
        <Stack spacing={3} sx={{ opacity: verifying ? 0.6 : 1 }}>
          <StatusCard report={report} />

          {withErrors.length > 0 && (
            <Alert
              severity="warning"
              action={<Button color="inherit" size="small" onClick={() => setRepairing({ tables: null, label: 'todas las tablas con errores' })}>Reparar todo</Button>}
            >
              Reparar acepta los datos tal como están ahora. Si creés que alguien los modificó por fuera del sistema,{' '}
              <Link component={RouterLink} to="/backup" color="inherit" sx={{ fontWeight: 600 }}>restaurá un backup</Link>.
            </Alert>
          )}

          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Tabla</TableCell>
                  <TableCell align="right">Filas revisadas</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell />
                </TableRow>
              </TableHead>
              <TableBody>
                {report.tables.map((table) => {
                  const bad = hasErrors(table)
                  const open = expanded === table.table
                  return (
                    <Fragment key={table.table}>
                      <TableRow>
                        <TableCell>
                          <Stack direction="row" sx={{ alignItems: 'center', gap: 0.5 }}>
                            {table.errors.length > 0 && (
                              <IconButton size="small" onClick={() => setExpanded(open ? null : table.table)} aria-label={open ? 'Ocultar los registros' : 'Ver los registros alterados'}>
                                {open ? <ExpandLessRounded /> : <ExpandMoreRounded />}
                              </IconButton>
                            )}
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 500, color: 'navy.main' }}>{table.label}</Typography>
                              {table.shared && <Typography variant="caption" sx={{ color: 'text.secondary' }}>Compartida por todos los clubes</Typography>}
                            </Box>
                          </Stack>
                        </TableCell>
                        <TableCell align="right">{table.checked}</TableCell>
                        <TableCell>
                          <Stack direction="row" sx={{ gap: 0.5, flexWrap: 'wrap' }}>
                            <StatusChip status={bad ? 'overdue' : 'ok'} label={bad ? (table.errors.length ? `${table.errors.length} alterados` : 'Con errores') : 'Correcta'} />
                            {!table.dvvOk && <StatusChip status="overdue" label="DVV distinto" />}
                          </Stack>
                        </TableCell>
                        <TableCell align="right">
                          {bad && <Button size="small" color="secondary" onClick={() => setRepairing({ tables: [table.table], label: table.label })}>Reparar tabla</Button>}
                        </TableCell>
                      </TableRow>
                      {table.errors.length > 0 && (
                        <TableRow>
                          <TableCell colSpan={4} sx={{ py: 0, borderBottom: open ? undefined : 0 }}>
                            <Collapse in={open} unmountOnExit>
                              <Box sx={{ py: 1.5 }}>
                                <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>Registros alterados (clave · DVH guardado → calculado)</Typography>
                                {table.errors.map((item) => (
                                  <Typography key={item.key} variant="body2" sx={{ color: 'text.secondary' }}>
                                    {item.key} · {item.storedDvh ?? '—'} → {item.computedDvh}
                                  </Typography>
                                ))}
                              </Box>
                            </Collapse>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  )
                })}
              </TableBody>
            </Table>
          </TableContainer>
          {!report.tables.every((table) => table.dvvOk) && (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              El DVV es de la tabla completa (de todos los clubes): si no coincide, puede ser por otro club. Reparar lo recalcula.
            </Typography>
          )}
        </Stack>
      )}

      <Dialog open={Boolean(repairing)} onClose={sending ? undefined : () => setRepairing(null)} maxWidth="sm" fullWidth>
        {repairing && (
          <>
            <DialogTitle>¿Reparar {repairing.label}?</DialogTitle>
            <DialogContent>
              <DialogContentText>
                Reparar recalcula los dígitos verificadores y acepta los datos tal como están ahora. Si creés que alguien
                modificó datos por fuera del sistema, restaurá un backup en lugar de reparar.
              </DialogContentText>
              <Link component={RouterLink} to="/backup" color="secondary" sx={{ display: 'inline-block', mt: 1.5, fontWeight: 600 }}>Restaurar un backup</Link>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
              <Button color="secondary" onClick={() => setRepairing(null)} disabled={sending}>Volver</Button>
              <Button variant="contained" color="secondary" onClick={handleRepair} loading={sending}>Reparar</Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      <Snackbar open={notice.open} autoHideDuration={6000} onClose={closeNotice} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={notice.severity} variant="filled" onClose={closeNotice}>{notice.message}</Alert>
      </Snackbar>
    </>
  )
}
