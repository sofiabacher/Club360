import { useCallback, useEffect, useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import Snackbar from '@mui/material/Snackbar'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import { getMyCitations, respondCitation } from '../../api/citations.api.js'
import CitationSections from '../../components/citations/CitationSections.jsx'
import { getErrorMessage } from '../../utils/apiErrors.js'

const JUSTIFICATION_MIN = 10
const JUSTIFICATION_MAX = 300

// Mis citaciones (citations.respond): las Pendientes arriba para confirmar o rechazar dentro de las 24 horas, las
// próximas ya respondidas y el historial. Rechazar pide una justificación de 10 a 300 caracteres
export default function MyCitationsPage() {
  const [data, setData] = useState(null)   // { upcoming, history }
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState(null)
  const [rejecting, setRejecting] = useState(null)   // { citation, justification }
  const [notice, setNotice] = useState({ open: false, severity: 'success', message: '' })
  const closeNotice = () => setNotice((current) => ({ ...current, open: false }))

  const load = useCallback(() => {
    Promise.all([getMyCitations('upcoming'), getMyCitations('history')])
      .then(([upcoming, history]) => setData({ upcoming: upcoming.data.items, history: history.data.items }))
      .catch((err) => setError(getErrorMessage(err)))
  }, [])

  useEffect(() => { load() }, [load])

  const send = async (citation, response, justification) => {
    setBusyId(citation.id)
    try {
      await respondCitation(citation.id, response, justification)
      setNotice({
        open: true,
        severity: 'success',
        message: response === 'confirm' ? '¡Listo! Confirmaste la citación.' : 'Listo, quedó registrado que no podés ir.'
      })
      setRejecting(null)
      load()
    } catch (err) {
      setNotice({ open: true, severity: 'error', message: getErrorMessage(err) })
    } finally {
      setBusyId(null)
    }
  }

  if (error) return <Alert severity="error">{error}</Alert>

  if (!data) {
    return <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}><CircularProgress color="secondary" /></Box>
  }

  const justification = rejecting?.justification.trim() ?? ''
  const justificationOk = justification.length >= JUSTIFICATION_MIN && justification.length <= JUSTIFICATION_MAX

  return (
    <>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" component="h2" sx={{ color: 'navy.main' }}>Mis citaciones</Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Tenés 24 horas para responder cada citación. Si no respondés, queda confirmada.
        </Typography>
      </Box>

      <CitationSections
        upcoming={data.upcoming}
        history={data.history}
        emptyText="No tenés citaciones por ahora."
        cardProps={(citation) => ({
          busy: busyId === citation.id,
          onConfirm: (item) => send(item, 'confirm'),
          onReject: (item) => setRejecting({ citation: item, justification: '' })
        })}
      />

      <Dialog open={Boolean(rejecting)} onClose={busyId ? undefined : () => setRejecting(null)} fullWidth maxWidth="sm">
        {rejecting && (
          <>
            <DialogTitle>¿No podés ir?</DialogTitle>
            <DialogContent>
              <DialogContentText sx={{ mb: 2 }}>
                Contale a tu entrenadora por qué no podés ir a {rejecting.citation.game.category?.name} vs. {rejecting.citation.game.rival}.
                Una vez enviada, la respuesta no se puede cambiar.
              </DialogContentText>
              <TextField
                label="Justificación"
                value={rejecting.justification}
                onChange={(event) => setRejecting((current) => ({ ...current, justification: event.target.value }))}
                multiline
                minRows={3}
                fullWidth
                autoFocus
                slotProps={{ htmlInput: { maxLength: JUSTIFICATION_MAX } }}
                error={rejecting.justification.length > 0 && !justificationOk}
                helperText={`${justification.length}/${JUSTIFICATION_MAX} · mínimo ${JUSTIFICATION_MIN} caracteres`}
              />
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
              <Button color="secondary" onClick={() => setRejecting(null)} disabled={Boolean(busyId)}>Volver</Button>
              <Button
                variant="contained"
                color="secondary"
                onClick={() => send(rejecting.citation, 'reject', justification)}
                disabled={!justificationOk}
                loading={Boolean(busyId)}
              >
                Enviar
              </Button>
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
