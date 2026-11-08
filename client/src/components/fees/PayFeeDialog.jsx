import { useEffect, useRef, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import IconButton from '@mui/material/IconButton'
import Paper from '@mui/material/Paper'
import Snackbar from '@mui/material/Snackbar'
import Stack from '@mui/material/Stack'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import AccountBalanceRounded from '@mui/icons-material/AccountBalanceRounded'
import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded'
import CloseRounded from '@mui/icons-material/CloseRounded'
import ContentCopyRounded from '@mui/icons-material/ContentCopyRounded'
import CreditCardRounded from '@mui/icons-material/CreditCardRounded'
import ErrorRounded from '@mui/icons-material/ErrorRounded'
import HourglassTopRounded from '@mui/icons-material/HourglassTopRounded'
import InsertDriveFileRounded from '@mui/icons-material/InsertDriveFileRounded'
import UploadFileRounded from '@mui/icons-material/UploadFileRounded'

import { getTransferInfo, payFee, reportTransfer } from '../../api/fees.api.js'
import { getErrorMessage } from '../../utils/apiErrors.js'
import { TRANSACTION_STATES } from '../../utils/constants.js'
import { formatMoney, formatPeriod } from '../../utils/format.js'

const TABS = { CARD: 'card', TRANSFER: 'transfer' }

const emptyCard = { cardNumber: '', cardHolder: '', cardExpiry: '', cardCvv: '' }

// ---------- Tarjeta: formato y validación en vivo (el back vuelve a validar todo) ----------

const digitsOf = (value) => value.replace(/\D/g, '')

// Hasta 19 dígitos, en grupos de 4 separados por guiones: '4242-4242-4242-4242'
const formatCardNumber = (value) => (digitsOf(value).slice(0, 19).match(/.{1,4}/g) ?? []).join('-')

// 'MMAA' mientras se escribe → 'MM/AA' (la barra aparece sola)
function formatExpiry(value) {
  const digits = digitsOf(value).slice(0, 4)
  return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits
}

// Vencimiento MM/AA sin vencer: la tarjeta vale hasta el último día de ese mes
function expiryError(value) {
  const match = /^(0[1-9]|1[0-2])\/(\d{2})$/.exec(value)
  if (!match) return 'Ingresá el vencimiento como MM/AA.'
  const now = new Date()
  const year = 2000 + Number(match[2])
  const month = Number(match[1])
  if (year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth() + 1)) return 'La tarjeta está vencida.'
  return null
}

// Mensaje de error de cada campo, o null si está bien
const CARD_CHECKS = {
  cardNumber: (card) => (/^\d{13,19}$/.test(digitsOf(card.cardNumber)) ? null : 'El número tiene entre 13 y 19 dígitos.'),
  cardHolder: (card) => (card.cardHolder.trim() ? null : 'Ingresá el nombre como figura en la tarjeta.'),
  cardExpiry: (card) => expiryError(card.cardExpiry),
  cardCvv: (card) => (/^\d{3,4}$/.test(card.cardCvv) ? null : 'El código tiene 3 o 4 dígitos.')
}

const isCardValid = (card) => Object.values(CARD_CHECKS).every((check) => !check(card))

// ---------- Transferencia: el comprobante ----------

const RECEIPT_TYPES = ['image/jpeg', 'image/png', 'application/pdf']
const RECEIPT_MAX_SIZE = 5 * 1024 * 1024   // 5 MB

function receiptError(file) {
  if (!RECEIPT_TYPES.includes(file.type)) return 'El comprobante tiene que ser una imagen JPG o PNG, o un PDF.'
  if (file.size > RECEIPT_MAX_SIZE) return 'El archivo no puede pesar más de 5 MB.'
  return null
}

const formatSize = (bytes) => (bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB`)

// Un dato bancario con botón para copiarlo
function BankRow({ label, value, onCopy }) {
  return (
    <Stack direction="row" sx={{ alignItems: 'center', gap: 1, py: 0.5 }}>
      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>{label}</Typography>
        <Typography variant="body2" sx={{ fontWeight: 500, color: 'navy.main', overflowWrap: 'anywhere' }}>{value}</Typography>
      </Box>
      {onCopy && (
        <Tooltip title={`Copiar ${label.toLowerCase()}`}>
          <IconButton onClick={() => onCopy(value)} aria-label={`Copiar ${label.toLowerCase()}`} color="secondary" size="small">
            <ContentCopyRounded fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
    </Stack>
  )
}

function TransferForm({ fee, file, setFile, fileError, setFileError, error }) {
  const [bankInfo, setBankInfo] = useState(undefined)   // undefined: cargando; null: el club no los cargó
  const [loadError, setLoadError] = useState('')
  const [copied, setCopied] = useState(false)
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    getTransferInfo()
      .then(({ data }) => setBankInfo(data.bankInfo))
      .catch((err) => setLoadError(getErrorMessage(err)))
  }, [])

  const copy = (value) => {
    navigator.clipboard?.writeText(value).then(() => setCopied(true)).catch(() => {})
  }

  const choose = (chosen) => {
    if (!chosen) return
    const problem = receiptError(chosen)
    setFileError(problem ?? '')
    setFile(problem ? null : chosen)
  }

  const handleDrop = (event) => {
    event.preventDefault()
    setDragging(false)
    choose(event.dataTransfer.files?.[0])
  }

  if (loadError) return <Alert severity="error">{loadError}</Alert>
  if (bankInfo === undefined) return <Box sx={{ display: 'grid', placeItems: 'center', py: 4 }}><CircularProgress color="secondary" /></Box>
  if (bankInfo === null) return <Alert severity="info">El club todavía no cargó sus datos para transferencias. Consultá en secretaría.</Alert>

  return (
    <Stack spacing={2.5}>
      {error && <Alert severity="error">{error}</Alert>}

      <Box>
        <Typography variant="subtitle2" sx={{ color: 'navy.main', mb: 1 }}>1. Transferí el monto exacto</Typography>
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Stack direction="row" sx={{ alignItems: 'center', gap: 1, mb: 1 }}>
            <AccountBalanceRounded sx={{ color: 'secondary.main' }} />
            <Typography variant="body2" sx={{ fontWeight: 600, color: 'navy.main' }}>{bankInfo.bank}</Typography>
          </Stack>
          <BankRow label="Titular" value={bankInfo.holder} />
          <BankRow label="CUIT" value={bankInfo.cuit} />
          <BankRow label="CBU" value={bankInfo.cbu} onCopy={copy} />
          <BankRow label="Alias" value={bankInfo.alias} onCopy={copy} />
        </Paper>
        <Box sx={{ mt: 1.5, textAlign: 'center' }}>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>Monto a transferir</Typography>
          <Typography variant="numeric" component="p" sx={{ fontSize: '2.4rem', color: 'navy.main', lineHeight: 1.1 }}>{formatMoney(fee.total)}</Typography>
        </Box>
      </Box>

      <Box>
        <Typography variant="subtitle2" sx={{ color: 'navy.main', mb: 1 }}>2. Adjuntá el comprobante</Typography>
        <Box
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); inputRef.current?.click() } }}
          onDragOver={(event) => { event.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          sx={{
            border: 2,
            borderStyle: 'dashed',
            borderColor: fileError ? 'error.main' : dragging ? 'secondary.main' : 'divider',
            borderRadius: 2,
            bgcolor: dragging ? 'action.hover' : 'background.default',
            p: 2.5,
            textAlign: 'center',
            cursor: 'pointer',
            '&:focus-visible': { outline: 2, outlineColor: 'secondary.main', outlineStyle: 'solid' }
          }}
        >
          <UploadFileRounded sx={{ fontSize: 36, color: 'secondary.main' }} />
          <Typography variant="body2" sx={{ color: 'navy.main', fontWeight: 500 }}>Arrastrá el archivo o tocá para elegirlo</Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>JPG, PNG o PDF, hasta 5 MB</Typography>
          <input
            ref={inputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
            hidden
            onChange={(event) => { choose(event.target.files?.[0]); event.target.value = '' }}
          />
        </Box>
        {fileError && <Typography variant="caption" sx={{ color: 'error.main', display: 'block', mt: 0.5 }}>{fileError}</Typography>}
        {file && (
          <Paper variant="outlined" sx={{ mt: 1.5, p: 1.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <InsertDriveFileRounded sx={{ color: 'secondary.main' }} />
            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
              <Typography variant="body2" sx={{ fontWeight: 500, color: 'navy.main' }} noWrap>{file.name}</Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>{formatSize(file.size)}</Typography>
            </Box>
            <IconButton onClick={() => setFile(null)} aria-label="Quitar el archivo" size="small">
              <CloseRounded fontSize="small" />
            </IconButton>
          </Paper>
        )}
      </Box>

      <Snackbar open={copied} autoHideDuration={2000} onClose={() => setCopied(false)} message="Copiado" anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }} />
    </Stack>
  )
}

// Pago de una cuota, con dos pestañas:
//   - Tarjeta: pago simulado (la tarjeta no se guarda). Aprobado (con el código y "Ver comprobante") o rechazado
//     (con la opción de reintentar);
//   - Transferencia: los datos del club, el monto exacto y el comprobante adjunto. Queda en revisión del club.
// onClose(changed): changed es true si hubo algún pago o transferencia informada
export default function PayFeeDialog({ fee, memberName, onClose }) {
  const [tab, setTab] = useState(TABS.CARD)
  const [card, setCard] = useState(emptyCard)
  const [touched, setTouched] = useState({})
  const [file, setFile] = useState(null)
  const [fileError, setFileError] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)   // { payment, feeState, recovered? }

  const setField = (field, transform = (value) => value) => (event) => {
    const value = transform(event.target.value)
    setCard((current) => ({ ...current, [field]: value }))
  }

  const touch = (field) => () => setTouched((current) => ({ ...current, [field]: true }))

  // Error visible de un campo: desde que se sale del campo por primera vez, y se actualiza mientras se escribe
  const fieldError = (field) => {
    const message = CARD_CHECKS[field](card)
    return touched[field] ? message : null
  }

  const changeTab = (event, value) => {
    setTab(value)
    setError('')
  }

  const handlePay = async () => {
    setSending(true)
    setError('')
    try {
      const { data } = await payFee(fee.id, { ...card, cardNumber: digitsOf(card.cardNumber) })
      setResult(data)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSending(false)
    }
  }

  const handleTransfer = async () => {
    setSending(true)
    setError('')
    try {
      const { data } = await reportTransfer(fee.id, file)
      setResult(data)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSending(false)
    }
  }

  const retry = () => {
    setResult(null)
    setTouched({})
    setCard((current) => ({ ...current, cardNumber: '', cardCvv: '' }))
  }

  const state = result?.payment.transactionState
  const isTransfer = tab === TABS.TRANSFER
  const close = () => onClose(Boolean(result))

  return (
    <Dialog open onClose={sending ? undefined : close} fullWidth maxWidth="xs">
      <DialogTitle>Pagar {formatPeriod(fee.period)}</DialogTitle>

      {!result && (
        <>
          <Tabs value={tab} onChange={changeTab} variant="fullWidth" textColor="secondary" indicatorColor="secondary" sx={{ px: 3, borderBottom: 1, borderColor: 'divider' }}>
            <Tab value={TABS.CARD} label="Tarjeta" icon={<CreditCardRounded />} iconPosition="start" sx={{ minHeight: 48 }} disabled={sending} />
            <Tab value={TABS.TRANSFER} label="Transferencia" icon={<AccountBalanceRounded />} iconPosition="start" sx={{ minHeight: 48 }} disabled={sending} />
          </Tabs>

          <DialogContent sx={{ pt: '20px !important' }}>
            {memberName && <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>Cuota de {memberName}</Typography>}

            {!isTransfer && (
              <>
                <Stack direction="row" sx={{ alignItems: 'center', gap: 1.5, mb: 2 }}>
                  <CreditCardRounded sx={{ fontSize: 40, color: 'secondary.main' }} />
                  <Box>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>Total a pagar</Typography>
                    <Typography variant="numeric" component="p" sx={{ fontSize: '2rem', color: 'navy.main', lineHeight: 1.1 }}>{formatMoney(fee.total)}</Typography>
                  </Box>
                </Stack>

                <Alert severity="info" sx={{ mb: 2 }}>
                  Pago simulado: no se cobra nada. Usá cualquier número de tarjeta; los que terminan en 0000 se rechazan.
                </Alert>
                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                <Stack spacing={2}>
                  <TextField
                    label="Número de tarjeta"
                    placeholder="4242-4242-4242-4242"
                    value={card.cardNumber}
                    onChange={setField('cardNumber', formatCardNumber)}
                    onBlur={touch('cardNumber')}
                    error={Boolean(fieldError('cardNumber'))}
                    helperText={fieldError('cardNumber') ?? ' '}
                    autoFocus
                    fullWidth
                    slotProps={{ htmlInput: { inputMode: 'numeric', autoComplete: 'off', maxLength: 23 } }}
                  />
                  <TextField
                    label="Titular (como figura en la tarjeta)"
                    value={card.cardHolder}
                    onChange={setField('cardHolder')}
                    onBlur={touch('cardHolder')}
                    error={Boolean(fieldError('cardHolder'))}
                    helperText={fieldError('cardHolder') ?? ' '}
                    fullWidth
                    slotProps={{ htmlInput: { maxLength: 100, autoComplete: 'off' } }}
                  />
                  <Stack direction="row" spacing={2}>
                    <TextField
                      label="Vencimiento"
                      placeholder="MM/AA"
                      value={card.cardExpiry}
                      onChange={setField('cardExpiry', formatExpiry)}
                      onBlur={touch('cardExpiry')}
                      error={Boolean(fieldError('cardExpiry'))}
                      helperText={fieldError('cardExpiry') ?? ' '}
                      fullWidth
                      slotProps={{ htmlInput: { inputMode: 'numeric', autoComplete: 'off', maxLength: 5 } }}
                    />
                    <TextField
                      label="Código"
                      type="password"
                      value={card.cardCvv}
                      onChange={setField('cardCvv', (value) => digitsOf(value).slice(0, 4))}
                      onBlur={touch('cardCvv')}
                      error={Boolean(fieldError('cardCvv'))}
                      helperText={fieldError('cardCvv') ?? ' '}
                      fullWidth
                      slotProps={{ htmlInput: { inputMode: 'numeric', autoComplete: 'off', maxLength: 4 } }}
                    />
                  </Stack>
                </Stack>
              </>
            )}

            {isTransfer && (
              <TransferForm fee={fee} file={file} setFile={setFile} fileError={fileError} setFileError={setFileError} error={error} />
            )}
          </DialogContent>

          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button color="secondary" onClick={close} disabled={sending}>Volver</Button>
            {isTransfer ? (
              <Button variant="contained" color="primary" onClick={handleTransfer} disabled={!file} loading={sending}>
                Informar transferencia
              </Button>
            ) : (
              <Button variant="contained" color="primary" onClick={handlePay} disabled={!isCardValid(card)} loading={sending}>
                Pagar {formatMoney(fee.total)}
              </Button>
            )}
          </DialogActions>
        </>
      )}

      {result && (
        <>
          <DialogContent>
            <Stack sx={{ alignItems: 'center', textAlign: 'center', gap: 1, py: 1 }}>
              {state === TRANSACTION_STATES.APPROVED && <CheckCircleRounded sx={(theme) => ({ fontSize: 56, color: theme.status.ok.fg })} />}
              {state === TRANSACTION_STATES.REJECTED && <ErrorRounded sx={(theme) => ({ fontSize: 56, color: theme.status.overdue.fg })} />}
              {state === TRANSACTION_STATES.PENDING && <HourglassTopRounded sx={(theme) => ({ fontSize: 56, color: theme.status.pending.fg })} />}

              <Typography variant="h6" sx={{ color: 'navy.main' }}>
                {state === TRANSACTION_STATES.APPROVED && '¡Pago aprobado!'}
                {state === TRANSACTION_STATES.REJECTED && 'El pago fue rechazado'}
                {state === TRANSACTION_STATES.PENDING && 'Transferencia informada'}
              </Typography>

              {state === TRANSACTION_STATES.REJECTED && (
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>La tarjeta no fue aceptada. La cuota sigue sin pagar: podés intentar con otra.</Typography>
              )}
              {state === TRANSACTION_STATES.PENDING && (
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>Recibimos tu comprobante. El club lo va a revisar y te avisamos por acá.</Typography>
              )}
              {state !== TRANSACTION_STATES.REJECTED && (
                <Box>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>{state === TRANSACTION_STATES.APPROVED ? 'Código de confirmación' : 'Código de la transferencia'}</Typography>
                  <Typography variant="numeric" component="p" sx={{ fontSize: '1.8rem', color: 'navy.main' }}>{result.payment.confirmationCode}</Typography>
                </Box>
              )}
              {result.recovered && <Alert severity="success" sx={{ mt: 1, width: '100%' }}>¡Recuperaste tu condición de socio!</Alert>}
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2, flexWrap: 'wrap', gap: 1 }}>
            {state === TRANSACTION_STATES.REJECTED && <Button color="secondary" onClick={retry}>Reintentar</Button>}
            {state === TRANSACTION_STATES.APPROVED && (
              <Button component={RouterLink} to={`/fees/payments/${result.payment.id}/voucher`} color="secondary" variant="outlined">
                Ver comprobante
              </Button>
            )}
            <Button variant="contained" color="secondary" onClick={close}>Listo</Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  )
}
