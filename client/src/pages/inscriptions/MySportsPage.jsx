import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import Snackbar from '@mui/material/Snackbar'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import SportsRounded from '@mui/icons-material/SportsRounded'

import { getMySports, requestInscription, withdrawInscription } from '../../api/inscriptions.api.js'
import EmptyState from '../../components/common/EmptyState.jsx'
import StatusChip from '../../components/common/StatusChip.jsx'
import useAuth from '../../hooks/useAuth.js'
import { getErrorMessage } from '../../utils/apiErrors.js'
import { INSCRIPTION_STATES, MEMBER_STATES } from '../../utils/constants.js'
import { formatDate, formatMoney } from '../../utils/format.js'

// Chip de la inscripción: Pendiente, Aprobada o Rechazada. Sin inscripción (o Cancelada), sin chip
const STATE_CHIPS = {
  [INSCRIPTION_STATES.PENDING]: { status: 'pending', label: 'Pendiente' },
  [INSCRIPTION_STATES.APPROVED]: { status: 'ok', label: 'Aprobada' },
  [INSCRIPTION_STATES.REJECTED]: { status: 'overdue', label: 'Rechazada' }
}

// Texto de lo que cambió al cancelar una solicitud o darse de baja
function withdrawMessage(sportName, data) {
  if (!data.withdrawn) return `Cancelaste tu solicitud de inscripción a ${sportName}.`

  const parts = [`Te diste de baja de ${sportName}.`]
  if (data.removedCategories > 0) parts.push(`Saliste de ${data.removedCategories === 1 ? '1 categoría' : `${data.removedCategories} categorías`}.`)
  if (data.cancelledCitations > 0) parts.push(`Se ${data.cancelledCitations === 1 ? 'canceló 1 citación' : `cancelaron ${data.cancelledCitations} citaciones`}.`)
  if (data.lostPlayerRole) parts.push('Ya no tenés el rol Jugadora.')
  return parts.join(' ')
}

function SportCard({ sport, busy, onRequest, onCancel, onWithdraw }) {
  const { inscription, actions } = sport
  const chip = inscription && STATE_CHIPS[inscription.inscriptionState]

  return (
    <Card>
      <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ gap: 2, alignItems: { sm: 'center' } }}>
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Stack direction="row" sx={{ alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Typography variant="h6" component="h3" sx={{ color: 'navy.main' }}>{sport.name}</Typography>
              {chip && <StatusChip status={chip.status} label={chip.label} />}
            </Stack>
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
              Cuota deportiva: <Typography component="span" variant="numeric" sx={{ fontSize: '1.1rem', color: 'navy.main' }}>{formatMoney(sport.priceFee)}</Typography> por mes
            </Typography>
            {inscription?.inscriptionState === INSCRIPTION_STATES.PENDING && (
              <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                La pediste el {formatDate(inscription.createdAt)}. El Representante del deporte la va a revisar.
              </Typography>
            )}
            {inscription?.inscriptionState === INSCRIPTION_STATES.REJECTED && (
              <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5, overflowWrap: 'anywhere' }}>
                {inscription.reason ? `Motivo: ${inscription.reason}. ` : ''}Podés volver a pedirla.
              </Typography>
            )}
          </Box>

          <Box sx={{ flexShrink: 0, width: { xs: '100%', sm: 'auto' } }}>
            {actions.request && (
              <Button variant="contained" color="primary" onClick={() => onRequest(sport)} loading={busy} fullWidth>Inscribirme</Button>
            )}
            {actions.cancel && (
              <Button variant="outlined" color="secondary" onClick={() => onCancel(sport)} disabled={busy} fullWidth>Cancelar solicitud</Button>
            )}
            {actions.withdraw && (
              <Button variant="outlined" color="secondary" onClick={() => onWithdraw(sport)} disabled={busy} fullWidth>Darme de baja</Button>
            )}
          </Box>
        </Stack>
      </CardContent>
    </Card>
  )
}

// Mis deportes (inscriptions.request): los deportes del club con el estado de la inscripción del socio. Desde acá se
// inscribe, cancela una solicitud Pendiente o se da de baja de un deporte (inmediata, con confirmación)
export default function MySportsPage() {
  const navigate = useNavigate()
  const { startSession, refreshSession } = useAuth()
  const [data, setData] = useState(null)   // { memberStateId, items }
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState(null)   // clubSportId en curso
  const [confirming, setConfirming] = useState(null)   // { sport, kind: 'cancel' | 'withdraw' }
  const [notice, setNotice] = useState({ open: false, severity: 'success', message: '' })
  const closeNotice = () => setNotice((current) => ({ ...current, open: false }))

  const load = useCallback(() => {
    getMySports()
      .then(({ data: sports }) => setData(sports))
      .catch((err) => setError(getErrorMessage(err)))
  }, [])

  useEffect(() => { load() }, [load])

  const handleRequest = async (sport) => {
    setBusyId(sport.clubSportId)
    try {
      await requestInscription(sport.clubSportId)
      setNotice({ open: true, severity: 'success', message: `Pediste la inscripción a ${sport.name}. Te avisamos cuando la revisen.` })
      load()
    } catch (err) {
      setNotice({ open: true, severity: 'error', message: getErrorMessage(err) })
      load()
    } finally {
      setBusyId(null)
    }
  }

  const handleConfirm = async () => {
    const { sport } = confirming
    setBusyId(sport.clubSportId)
    try {
      const { data: result } = await withdrawInscription(sport.inscription.id)

      // Si perdió el rol con el que estaba trabajando, el back manda una sesión nueva: con un solo rol entra directo,
      // con más tiene que elegir
      if (result.newSession) {
        startSession(result.newSession)
        navigate(result.newSession.requiresRoleSelection ? '/select-role' : '/', { replace: true })
        return
      }

      if (result.lostPlayerRole) await refreshSession()
      setConfirming(null)
      setNotice({ open: true, severity: 'success', message: withdrawMessage(sport.name, result) })
      load()
    } catch (err) {
      setConfirming(null)
      setNotice({ open: true, severity: 'error', message: getErrorMessage(err) })
      load()
    } finally {
      setBusyId(null)
    }
  }

  if (error) return <Alert severity="error">{error}</Alert>

  if (!data) {
    return <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}><CircularProgress color="secondary" /></Box>
  }

  const running = confirming && busyId === confirming.sport.clubSportId

  return (
    <>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" component="h2" sx={{ color: 'navy.main' }}>Deportes</Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Los deportes del club. Cada deporte en el que estás inscripto suma su cuota deportiva a tu cuota mensual.
        </Typography>
      </Box>

      {data.memberStateId === MEMBER_STATES.SUSPENDED && (
        <Alert severity="warning" sx={{ mb: 2 }}>Tenés cuotas atrasadas: regularizá tu situación para inscribirte a un deporte.</Alert>
      )}

      {data.items.length === 0 ? (
        <EmptyState icon={SportsRounded} title="Sin deportes" description="El club todavía no ofrece deportes." />
      ) : (
        <Stack spacing={2}>
          {data.items.map((sport) => (
            <SportCard
              key={sport.clubSportId}
              sport={sport}
              busy={busyId === sport.clubSportId}
              onRequest={handleRequest}
              onCancel={(item) => setConfirming({ sport: item, kind: 'cancel' })}
              onWithdraw={(item) => setConfirming({ sport: item, kind: 'withdraw' })}
            />
          ))}
        </Stack>
      )}

      <Dialog open={Boolean(confirming)} onClose={running ? undefined : () => setConfirming(null)} fullWidth maxWidth="xs">
        {confirming && (
          <>
            <DialogTitle>
              {confirming.kind === 'withdraw' ? `¿Darte de baja de ${confirming.sport.name}?` : '¿Cancelar la solicitud?'}
            </DialogTitle>
            <DialogContent>
              <DialogContentText>
                {confirming.kind === 'withdraw'
                  ? `Vas a dejar de estar en tus categorías de ${confirming.sport.name}, se cancelan tus citaciones de partidos que todavía no se jugaron y, si no tenés otro deporte, dejás de ser Jugadora. La cuota deportiva deja de cobrarse desde el mes que viene; las cuotas ya generadas se siguen debiendo.`
                  : `Se cancela tu solicitud de inscripción a ${confirming.sport.name}. Después la podés volver a pedir.`}
              </DialogContentText>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
              <Button color="secondary" onClick={() => setConfirming(null)} disabled={running}>Volver</Button>
              <Button variant="contained" color="secondary" onClick={handleConfirm} loading={running}>
                {confirming.kind === 'withdraw' ? 'Darme de baja' : 'Cancelar solicitud'}
              </Button>
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
