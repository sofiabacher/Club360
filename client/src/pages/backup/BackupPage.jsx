import { useCallback, useEffect, useRef, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
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
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useTheme } from '@mui/material/styles'
import BackupRounded from '@mui/icons-material/BackupRounded'
import DownloadRounded from '@mui/icons-material/DownloadRounded'
import RestoreRounded from '@mui/icons-material/RestoreRounded'
import UploadFileRounded from '@mui/icons-material/UploadFileRounded'

import { CONFIRM_WORD, createBackup, downloadBackup, getBackups, restoreBackup, restoreBackupFile } from '../../api/backup.api.js'
import EmptyState from '../../components/common/EmptyState.jsx'
import useAuth from '../../hooks/useAuth.js'
import { getErrorMessage } from '../../utils/apiErrors.js'
import { BACKUP_TYPE_LABELS, TABLE_LABELS } from '../../utils/constants.js'
import { saveBlob } from '../../utils/download.js'
import { formatDateTimeLong } from '../../utils/format.js'

const MAX_FILE_SIZE = 20 * 1024 * 1024   // 20 MB

const formatSize = (bytes) => (bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB`)

const TypeChip = ({ type }) => <Chip label={BACKUP_TYPE_LABELS[type] ?? 'Desconocido'} size="small" variant="outlined" color={type === 'MANUAL' ? 'secondary' : 'default'} />

const createdByText = (backup) => (backup.createdBy ? backup.createdBy.username : 'Automático')

// Diálogo de restauración: el resumen del backup, la advertencia y escribir RESTAURAR para habilitar el botón
function RestoreDialog({ target, onClose, onRestored }) {
  const [confirm, setConfirm] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  const handleRestore = async () => {
    setSending(true)
    setError('')
    try {
      const { data } = target.file ? await restoreBackupFile(target.file, confirm) : await restoreBackup(target.fileName, confirm)
      onRestored(data)
    } catch (err) {
      setError(getErrorMessage(err))
      setSending(false)
    }
  }

  return (
    <Dialog open onClose={sending ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>¿Restaurar este backup?</DialogTitle>
      <DialogContent>
        {target.file ? (
          <Typography sx={{ mb: 1 }}>Archivo subido: <strong>{target.file.name}</strong> ({formatSize(target.file.size)}). Antes de restaurar se valida que sea de este club y que no esté modificado.</Typography>
        ) : (
          <>
            <Stack direction="row" sx={{ gap: 1, alignItems: 'center', flexWrap: 'wrap', mb: 1 }}>
              <TypeChip type={target.type} />
              <Typography>{formatDateTimeLong(target.createdAt)} · {target.totalRows} filas</Typography>
            </Stack>
            {target.tables && (
              <Box sx={{ columns: { xs: 1, sm: 2 }, mb: 1 }}>
                {Object.entries(target.tables).filter(([, count]) => count > 0).map(([table, count]) => (
                  <Typography key={table} variant="body2" sx={{ color: 'text.secondary', breakInside: 'avoid' }}>{TABLE_LABELS[table] ?? table}: {count}</Typography>
                ))}
              </Box>
            )}
          </>
        )}

        <Alert severity="warning" sx={{ my: 2 }}>
          Se reemplazan todos los datos del club por los de este backup. Lo que se cargó después se pierde (antes se guarda
          un backup del estado actual). La bitácora y las imágenes no cambian.
        </Alert>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <TextField
          label={`Escribí ${CONFIRM_WORD} para confirmar`}
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          fullWidth
          autoFocus
          slotProps={{ htmlInput: { autoComplete: 'off' } }}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button color="secondary" onClick={onClose} disabled={sending}>Volver</Button>
        <Button variant="contained" color="error" onClick={handleRestore} disabled={confirm !== CONFIRM_WORD} loading={sending}>Restaurar</Button>
      </DialogActions>
    </Dialog>
  )
}

// Copias de seguridad del club (backup.manage): generar, descargar y restaurar (de la lista o subiendo un archivo)
export default function BackupPage() {
  const theme = useTheme()
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'))
  const { refreshSession } = useAuth()

  const [items, setItems] = useState(null)
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)
  const [downloadingName, setDownloadingName] = useState(null)
  const [target, setTarget] = useState(null)   // backup de la lista o { file } a restaurar
  const [result, setResult] = useState(null)
  const [fileError, setFileError] = useState('')
  const [dragging, setDragging] = useState(false)
  const [notice, setNotice] = useState({ open: false, severity: 'success', message: '' })
  const closeNotice = () => setNotice((current) => ({ ...current, open: false }))
  const inputRef = useRef(null)

  const load = useCallback(() => {
    getBackups()
      .then(({ data }) => {
        setItems(data.items)
        setError('')
      })
      .catch((err) => setError(getErrorMessage(err)))
  }, [])

  useEffect(() => { load() }, [load])

  const handleCreate = async () => {
    setCreating(true)
    try {
      const { data } = await createBackup()
      setNotice({ open: true, severity: 'success', message: `Backup generado: ${data.totalRows} filas.` })
      load()
    } catch (err) {
      setNotice({ open: true, severity: 'error', message: getErrorMessage(err) })
    } finally {
      setCreating(false)
    }
  }

  const handleDownload = async (fileName) => {
    setDownloadingName(fileName)
    try {
      const { blob, fileName: name } = await downloadBackup(fileName)
      saveBlob(blob, name)
    } catch (err) {
      setNotice({ open: true, severity: 'error', message: getErrorMessage(err) })
    } finally {
      setDownloadingName(null)
    }
  }

  const chooseFile = (file) => {
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.json')) return setFileError('El backup tiene que ser un archivo .json.')
    if (file.size > MAX_FILE_SIZE) return setFileError('El archivo de backup no puede pesar más de 20 MB.')
    setFileError('')
    setTarget({ file })
  }

  const handleRestored = (data) => {
    setTarget(null)
    setResult(data)
    load()
    refreshSession().catch(() => {})   // Si cambiaron los permisos de quien restauró, el menú se actualiza
  }

  return (
    <>
      <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ justifyContent: 'space-between', alignItems: { sm: 'flex-start' }, gap: 2, mb: 3 }}>
        <Box>
          <Typography variant="h5" component="h2" sx={{ color: 'navy.main' }}>Copias de seguridad</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 640 }}>
            Se hace un backup automático todos los domingos a las 03:00. Se guardan los últimos 7. Descargá los importantes:
            el servidor de la demo puede borrarlos.
          </Typography>
        </Box>
        <Button variant="contained" color="primary" startIcon={<BackupRounded />} onClick={handleCreate} loading={creating} sx={{ flexShrink: 0 }}>
          Generar backup
        </Button>
      </Stack>

      {result && (
        <Alert severity={result.verification.status === 'OK' ? 'success' : 'warning'} sx={{ mb: 3 }} onClose={() => setResult(null)}>
          Restauración completa: {Object.values(result.rows).reduce((sum, count) => sum + count, 0)} filas. Integridad:{' '}
          {result.verification.status === 'OK' ? 'correcta' : (
            <>con errores (<Link component={RouterLink} to="/integrity" color="inherit" sx={{ fontWeight: 600 }}>revisar</Link>)</>
          )}. Antes se guardó el backup {result.preRestore}, por si hay que volver.
        </Alert>
      )}

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {!items && !error && <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}><CircularProgress color="secondary" /></Box>}

      {items && items.length === 0 && (
        <EmptyState icon={BackupRounded} title="Sin backups" description="Todavía no hay backups guardados en el servidor." />
      )}

      {items && items.length > 0 && (isDesktop ? (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Fecha</TableCell>
                <TableCell>Tipo</TableCell>
                <TableCell align="right">Tamaño</TableCell>
                <TableCell align="right">Filas</TableCell>
                <TableCell>Generado por</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((backup) => (
                <TableRow key={backup.fileName} hover>
                  <TableCell>{formatDateTimeLong(backup.createdAt)}</TableCell>
                  <TableCell><TypeChip type={backup.type} /></TableCell>
                  <TableCell align="right">{formatSize(backup.size)}</TableCell>
                  <TableCell align="right">{backup.totalRows ?? '—'}</TableCell>
                  <TableCell>{createdByText(backup)}</TableCell>
                  <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                    <Button size="small" color="secondary" startIcon={<DownloadRounded />} onClick={() => handleDownload(backup.fileName)} loading={downloadingName === backup.fileName}>Descargar</Button>
                    <Button size="small" color="secondary" startIcon={<RestoreRounded />} onClick={() => setTarget(backup)} disabled={backup.damaged}>Restaurar</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <Stack spacing={1.5}>
          {items.map((backup) => (
            <Card key={backup.fileName} variant="outlined">
              <CardContent sx={{ pb: 1 }}>
                <Stack direction="row" sx={{ justifyContent: 'space-between', gap: 1, alignItems: 'center' }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: 'navy.main' }}>{formatDateTimeLong(backup.createdAt)}</Typography>
                  <TypeChip type={backup.type} />
                </Stack>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {formatSize(backup.size)} · {backup.totalRows ?? '—'} filas · {createdByText(backup)}
                </Typography>
              </CardContent>
              <Divider />
              <Stack direction="row" sx={{ px: 1, py: 0.5, gap: 1 }}>
                <Button size="small" color="secondary" startIcon={<DownloadRounded />} onClick={() => handleDownload(backup.fileName)} loading={downloadingName === backup.fileName}>Descargar</Button>
                <Button size="small" color="secondary" startIcon={<RestoreRounded />} onClick={() => setTarget(backup)} disabled={backup.damaged}>Restaurar</Button>
              </Stack>
            </Card>
          ))}
        </Stack>
      ))}

      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" component="h3" sx={{ color: 'navy.main' }}>Restaurar desde un archivo</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>Un backup descargado antes (.json, hasta 20 MB), de este mismo club.</Typography>
          <Box
            role="button"
            tabIndex={0}
            onClick={() => inputRef.current?.click()}
            onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); inputRef.current?.click() } }}
            onDragOver={(event) => { event.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => { event.preventDefault(); setDragging(false); chooseFile(event.dataTransfer.files?.[0]) }}
            sx={{
              border: 2,
              borderStyle: 'dashed',
              borderColor: fileError ? 'error.main' : dragging ? 'secondary.main' : 'divider',
              borderRadius: 2,
              bgcolor: dragging ? 'action.hover' : 'background.default',
              p: 3,
              textAlign: 'center',
              cursor: 'pointer',
              '&:focus-visible': { outline: 2, outlineStyle: 'solid', outlineColor: 'secondary.main' }
            }}
          >
            <UploadFileRounded sx={{ fontSize: 36, color: 'secondary.main' }} />
            <Typography variant="body2" sx={{ color: 'navy.main', fontWeight: 500 }}>Arrastrá el archivo o tocá para elegirlo</Typography>
          </Box>
          <input ref={inputRef} type="file" accept=".json,application/json" hidden onChange={(event) => { chooseFile(event.target.files?.[0]); event.target.value = '' }} />
          {fileError && <Typography variant="caption" sx={{ color: 'error.main', display: 'block', mt: 0.5 }}>{fileError}</Typography>}
        </CardContent>
      </Card>

      {target && <RestoreDialog target={target} onClose={() => setTarget(null)} onRestored={handleRestored} />}

      <Snackbar open={notice.open} autoHideDuration={5000} onClose={closeNotice} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={notice.severity} variant="filled" onClose={closeNotice}>{notice.message}</Alert>
      </Snackbar>
    </>
  )
}
