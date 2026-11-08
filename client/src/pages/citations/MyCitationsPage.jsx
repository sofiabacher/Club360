import { useCallback, useEffect, useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import Snackbar from '@mui/material/Snackbar'
import Typography from '@mui/material/Typography'

import { getMyCitations, respondCitation } from '../../api/citations.api.js'
import CitationSections from '../../components/citations/CitationSections.jsx'
import RejectCitationDialog from '../../components/citations/RejectCitationDialog.jsx'
import { getErrorMessage } from '../../utils/apiErrors.js'

// Mis citaciones (citations.respond): las Pendientes arriba para confirmar o rechazar dentro de las 24 horas, las
// próximas ya respondidas y el historial. Rechazar pide una justificación de 10 a 300 caracteres
export default function MyCitationsPage() {
  const [data, setData] = useState(null)   // { upcoming, history }
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState(null)
  const [rejecting, setRejecting] = useState(null)   // citación que se está rechazando
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
          onReject: (item) => setRejecting(item)
        })}
      />

      {rejecting && (
        <RejectCitationDialog
          citation={rejecting}
          busy={busyId === rejecting.id}
          onClose={() => setRejecting(null)}
          onSend={(justification) => send(rejecting, 'reject', justification)}
        />
      )}

      <Snackbar open={notice.open} autoHideDuration={5000} onClose={closeNotice} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={notice.severity} variant="filled" onClose={closeNotice}>{notice.message}</Alert>
      </Snackbar>
    </>
  )
}
