import { useState } from 'react'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import { registerFeePayment } from '../../api/fees.api.js'
import { getErrorMessage } from '../../utils/apiErrors.js'
import { formatMoney, formatPeriod } from '../../utils/format.js'

const NOTE_MAX = 300

// Pago en secretaría (fees.manage): el total de la cuota y una nota opcional. onDone(result) después de registrarlo
export default function RegisterPaymentDialog({ fee, memberName, onClose, onDone }) {
  const [note, setNote] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    setSending(true)
    setError('')
    try {
      const { data } = await registerFeePayment(fee.id, note.trim() || null)
      onDone(data)
    } catch (err) {
      setError(getErrorMessage(err))
      setSending(false)
    }
  }

  return (
    <Dialog open onClose={sending ? undefined : onClose} fullWidth maxWidth="xs">
      <DialogTitle>Registrar pago en secretaría</DialogTitle>
      <DialogContent>
        <DialogContentText>{memberName} · {formatPeriod(fee.period)}</DialogContentText>
        <Typography variant="numeric" component="p" sx={{ fontSize: '2rem', color: 'navy.main', mb: 2 }}>{formatMoney(fee.total)}</Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <TextField
          label="Nota (opcional)"
          placeholder="Por ejemplo: pagó en efectivo"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          multiline
          minRows={2}
          fullWidth
          slotProps={{ htmlInput: { maxLength: NOTE_MAX } }}
          helperText={`${note.length}/${NOTE_MAX}`}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button color="secondary" onClick={onClose} disabled={sending}>Volver</Button>
        <Button variant="contained" color="secondary" onClick={handleSave} loading={sending}>Registrar pago</Button>
      </DialogActions>
    </Dialog>
  )
}
