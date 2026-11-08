import { useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded'
import ErrorRounded from '@mui/icons-material/ErrorRounded'

import { payFee } from '../../api/fees.api.js'
import { getErrorMessage } from '../../utils/apiErrors.js'
import { TRANSACTION_STATES } from '../../utils/constants.js'
import { formatMoney, formatPeriod } from '../../utils/format.js'

const emptyCard = { cardNumber: '', cardHolder: '', cardExpiry: '', cardCvv: '' }

// Controles del formulario (el back vuelve a validar todo)
const digitsOf = (value) => value.replace(/\D/g, '')
const isCardValid = (card) => /^\d{13,19}$/.test(digitsOf(card.cardNumber))
  && card.cardHolder.trim().length > 0
  && /^(0[1-9]|1[0-2])\/\d{2}$/.test(card.cardExpiry)
  && /^\d{3,4}$/.test(card.cardCvv)

// 'MMAA' mientras se escribe → 'MM/AA'
function formatExpiry(value) {
  const digits = digitsOf(value).slice(0, 4)
  return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits
}

// Pago simulado de una cuota: formulario de tarjeta (no se guarda), y el resultado aprobado (con el código de
// confirmación) o rechazado (con la opción de reintentar). onClose(changed): changed es true si hubo algún pago
export default function PayFeeDialog({ fee, memberName, onClose }) {
  const [card, setCard] = useState(emptyCard)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)   // { payment, feeState, recovered }

  const setField = (field, transform = (value) => value) => (event) => setCard((current) => ({ ...current, [field]: transform(event.target.value) }))

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

  const retry = () => {
    setResult(null)
    setCard((current) => ({ ...current, cardNumber: '', cardCvv: '' }))
  }

  const approved = result?.payment.transactionState === TRANSACTION_STATES.APPROVED
  const close = () => onClose(Boolean(result))

  return (
    <Dialog open onClose={sending ? undefined : close} fullWidth maxWidth="xs">
      <DialogTitle>Pagar {formatPeriod(fee.period)}</DialogTitle>

      {!result && (
        <>
          <DialogContent>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>{memberName ? `Cuota de ${memberName}` : 'Total a pagar'}</Typography>
            <Typography variant="numeric" component="p" sx={{ fontSize: '2rem', color: 'navy.main', mb: 2 }}>{formatMoney(fee.total)}</Typography>

            <Alert severity="info" sx={{ mb: 2 }}>
              Pago simulado: no se cobra nada. Usá cualquier número de tarjeta; los que terminan en 0000 se rechazan.
            </Alert>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            <Stack spacing={2}>
              <TextField
                label="Número de tarjeta"
                value={card.cardNumber}
                onChange={setField('cardNumber', (value) => value.replace(/[^\d ]/g, '').slice(0, 23))}
                autoFocus
                fullWidth
                slotProps={{ htmlInput: { inputMode: 'numeric', autoComplete: 'off' } }}
              />
              <TextField
                label="Titular (como figura en la tarjeta)"
                value={card.cardHolder}
                onChange={setField('cardHolder')}
                fullWidth
                slotProps={{ htmlInput: { maxLength: 100, autoComplete: 'off' } }}
              />
              <Stack direction="row" spacing={2}>
                <TextField
                  label="Vencimiento"
                  placeholder="MM/AA"
                  value={card.cardExpiry}
                  onChange={setField('cardExpiry', formatExpiry)}
                  fullWidth
                  slotProps={{ htmlInput: { inputMode: 'numeric', autoComplete: 'off' } }}
                />
                <TextField
                  label="Código"
                  value={card.cardCvv}
                  onChange={setField('cardCvv', (value) => digitsOf(value).slice(0, 4))}
                  fullWidth
                  slotProps={{ htmlInput: { inputMode: 'numeric', autoComplete: 'off' } }}
                />
              </Stack>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button color="secondary" onClick={close} disabled={sending}>Volver</Button>
            <Button variant="contained" color="secondary" onClick={handlePay} disabled={!isCardValid(card)} loading={sending}>
              Pagar {formatMoney(fee.total)}
            </Button>
          </DialogActions>
        </>
      )}

      {result && (
        <>
          <DialogContent>
            <Stack sx={{ alignItems: 'center', textAlign: 'center', gap: 1, py: 1 }}>
              {approved
                ? <CheckCircleRounded sx={(theme) => ({ fontSize: 56, color: theme.status.ok.fg })} />
                : <ErrorRounded sx={(theme) => ({ fontSize: 56, color: theme.status.overdue.fg })} />}
              <Typography variant="h6" sx={{ color: 'navy.main' }}>{approved ? '¡Pago aprobado!' : 'El pago fue rechazado'}</Typography>
              {approved ? (
                <Box>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>Código de confirmación</Typography>
                  <Typography variant="numeric" component="p" sx={{ fontSize: '1.8rem', color: 'navy.main' }}>{result.payment.confirmationCode}</Typography>
                </Box>
              ) : (
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>La tarjeta no fue aceptada. La cuota sigue sin pagar: podés intentar con otra.</Typography>
              )}
              {result.recovered && <Alert severity="success" sx={{ mt: 1, width: '100%' }}>¡Recuperaste tu condición de socio!</Alert>}
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            {!approved && <Button color="secondary" onClick={retry}>Reintentar</Button>}
            <Button variant="contained" color="secondary" onClick={close}>Listo</Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  )
}
