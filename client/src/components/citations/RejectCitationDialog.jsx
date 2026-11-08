import { useState } from 'react'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import TextField from '@mui/material/TextField'

const JUSTIFICATION_MIN = 10
const JUSTIFICATION_MAX = 300

// "¿No podés ir?": la jugadora rechaza una citación con una justificación de 10 a 300 caracteres.
// La usan Mis citaciones y el panel de inicio de la Jugadora. onSend(justification) manda la respuesta
export default function RejectCitationDialog({ citation, busy = false, onClose, onSend }) {
  const [text, setText] = useState('')
  const justification = text.trim()
  const valid = justification.length >= JUSTIFICATION_MIN && justification.length <= JUSTIFICATION_MAX

  return (
    <Dialog open onClose={busy ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>¿No podés ir?</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 2 }}>
          Contale a tu entrenadora por qué no podés ir a {citation.game.category?.name} vs. {citation.game.rival}.
          Una vez enviada, la respuesta no se puede cambiar.
        </DialogContentText>
        <TextField
          label="Justificación"
          value={text}
          onChange={(event) => setText(event.target.value)}
          multiline
          minRows={3}
          fullWidth
          autoFocus
          slotProps={{ htmlInput: { maxLength: JUSTIFICATION_MAX } }}
          error={text.length > 0 && !valid}
          helperText={`${justification.length}/${JUSTIFICATION_MAX} · mínimo ${JUSTIFICATION_MIN} caracteres`}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button color="secondary" onClick={onClose} disabled={busy}>Volver</Button>
        <Button variant="contained" color="secondary" onClick={() => onSend(justification)} disabled={!valid} loading={busy}>
          Enviar
        </Button>
      </DialogActions>
    </Dialog>
  )
}
