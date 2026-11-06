import { useCallback, useEffect, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
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
import InputAdornment from '@mui/material/InputAdornment'
import MenuItem from '@mui/material/MenuItem'
import Pagination from '@mui/material/Pagination'
import Snackbar from '@mui/material/Snackbar'
import Stack from '@mui/material/Stack'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import HowToRegRounded from '@mui/icons-material/HowToRegRounded'
import SearchRounded from '@mui/icons-material/SearchRounded'

import { approveInscription, getInscriptions, rejectInscription } from '../../api/inscriptions.api.js'
import EmptyState from '../../components/common/EmptyState.jsx'
import StatusChip from '../../components/common/StatusChip.jsx'
import { getErrorMessage } from '../../utils/apiErrors.js'
import { INSCRIPTION_STATES, MEMBER_STATES } from '../../utils/constants.js'
import { formatDate } from '../../utils/format.js'

const TABS = { PENDING: String(INSCRIPTION_STATES.PENDING), HISTORY: 'history' }

const REASON_MAX = 300

// Chip del estado de la inscripción (en el historial)
const STATE_CHIPS = {
  [INSCRIPTION_STATES.PENDING]: { status: 'pending', label: 'Pendiente' },
  [INSCRIPTION_STATES.APPROVED]: { status: 'ok', label: 'Aprobada' },
  [INSCRIPTION_STATES.REJECTED]: { status: 'overdue', label: 'Rechazada' },
  [INSCRIPTION_STATES.CANCELLED]: { status: 'overdue', label: 'Cancelada' }
}

// Socio que ya no está activo: no se puede aprobar su inscripción
const MEMBER_CHIPS = {
  [MEMBER_STATES.SUSPENDED]: { status: 'overdue', label: 'Socio suspendido' },
  [MEMBER_STATES.INACTIVE]: { status: 'overdue', label: 'Socio inactivo' }
}

function InscriptionCard({ inscription, busy, onApprove, onReject }) {
  const { member } = inscription
  const stateChip = STATE_CHIPS[inscription.inscriptionState]
  const memberChip = MEMBER_CHIPS[member.memberStateId]
  const pending = inscription.inscriptionState === INSCRIPTION_STATES.PENDING

  return (
    <Card>
      <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ gap: 2, alignItems: { sm: 'center' } }}>
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Stack direction="row" sx={{ alignItems: 'baseline', gap: 1, flexWrap: 'wrap' }}>
              <Typography sx={{ fontWeight: 600, color: 'navy.main', overflowWrap: 'anywhere' }}>{member.name}</Typography>
              <Typography variant="numeric" sx={{ fontSize: '1.15rem', color: 'text.secondary' }}>Nº {member.numMember}</Typography>
            </Stack>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {inscription.sport} · {member.seasonAge} años en la temporada · pedida el {formatDate(inscription.createdAt)}
            </Typography>
            {(!pending || memberChip) && (
              <Stack direction="row" sx={{ gap: 0.75, flexWrap: 'wrap', mt: 1 }}>
                {!pending && <StatusChip status={stateChip.status} label={stateChip.label} />}
                {memberChip && <StatusChip status={memberChip.status} label={memberChip.label} />}
              </Stack>
            )}
          </Box>

          {pending && (
            <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
              <Button variant="outlined" color="secondary" onClick={() => onReject(inscription)} disabled={busy} sx={{ flexGrow: { xs: 1, sm: 0 } }}>
                Rechazar
              </Button>
              <Button variant="contained" color="secondary" onClick={() => onApprove(inscription)} loading={busy} sx={{ flexGrow: { xs: 1, sm: 0 } }}>
                Aprobar
              </Button>
            </Stack>
          )}
        </Stack>
      </CardContent>
    </Card>
  )
}

// Inscripciones (inscriptions.approve): las solicitudes de los deportes del alcance, con las Pendientes para aprobar o
// rechazar y el historial. Aprobar le da el rol Jugadora; después hay que asignarla a una categoría desde Ligas
export default function InscriptionsPage() {
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState({ state: TABS.PENDING, clubSportId: '', search: '', page: 1 })   // Lo que se pidió al back
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState(null)
  const [rejecting, setRejecting] = useState(null)   // { inscription, reason }
  const [notice, setNotice] = useState({ open: false, severity: 'success', message: '', withLink: false })
  const closeNotice = () => setNotice((current) => ({ ...current, open: false }))

  // La búsqueda se manda cuando se deja de escribir y vuelve a la primera página
  useEffect(() => {
    const timer = setTimeout(() => setQuery((current) => (
      current.search === search.trim() ? current : { ...current, search: search.trim(), page: 1 }
    )), 350)

    return () => clearTimeout(timer)
  }, [search])

  const load = useCallback(() => {
    setLoading(true)
    getInscriptions(query)
      .then(({ data }) => {
        setResult(data)
        setError('')
      })
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false))
  }, [query])

  useEffect(() => { load() }, [load])

  const handleApprove = async (inscription) => {
    setBusyId(inscription.id)
    try {
      await approveInscription(inscription.id)
      setNotice({ open: true, severity: 'success', message: `Aprobaste la inscripción de ${inscription.member.name} a ${inscription.sport}.`, withLink: true })
      load()
    } catch (err) {
      setNotice({ open: true, severity: 'error', message: getErrorMessage(err), withLink: false })
      load()
    } finally {
      setBusyId(null)
    }
  }

  const handleReject = async () => {
    const { inscription, reason } = rejecting
    setBusyId(inscription.id)
    try {
      await rejectInscription(inscription.id, reason.trim() || null)
      setRejecting(null)
      setNotice({ open: true, severity: 'success', message: `Rechazaste la inscripción de ${inscription.member.name}. Le avisamos.`, withLink: false })
      load()
    } catch (err) {
      setRejecting(null)
      setNotice({ open: true, severity: 'error', message: getErrorMessage(err), withLink: false })
      load()
    } finally {
      setBusyId(null)
    }
  }

  const setFilter = (field) => (event, value) => setQuery((current) => ({ ...current, [field]: value ?? event.target.value, page: 1 }))

  const items = result?.items ?? []
  const sports = result?.sports ?? []
  const filtered = query.search || query.clubSportId
  const isPendingTab = query.state === TABS.PENDING

  return (
    <>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h5" component="h2" sx={{ color: 'navy.main' }}>Inscripciones</Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Las solicitudes de inscripción a {sports.length === 1 ? sports[0].name : 'los deportes del club'}. Al aprobar una, la socia pasa a ser Jugadora.
        </Typography>
      </Box>

      <Tabs value={query.state} onChange={setFilter('state')} textColor="secondary" indicatorColor="secondary" sx={{ mb: 2 }}>
        <Tab value={TABS.PENDING} label="Pendientes" />
        <Tab value={TABS.HISTORY} label="Historial" />
      </Tabs>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
        <TextField
          placeholder="Buscar por nombre, DNI o número de socio"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          size="small"
          sx={{ flexGrow: 1 }}
          slotProps={{
            input: { startAdornment: <InputAdornment position="start"><SearchRounded /></InputAdornment> },
            htmlInput: { maxLength: 100, 'aria-label': 'Buscar inscripciones' }
          }}
        />
        {sports.length > 1 && (
          <TextField select label="Deporte" value={query.clubSportId} onChange={(event) => setFilter('clubSportId')(event)} size="small" sx={{ minWidth: 180 }}>
            <MenuItem value="">Todos</MenuItem>
            {sports.map((sport) => <MenuItem key={sport.clubSportId} value={sport.clubSportId}>{sport.name}</MenuItem>)}
          </TextField>
        )}
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {!result && loading && (
        <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}>
          <CircularProgress color="secondary" />
        </Box>
      )}

      {result && items.length === 0 && (
        filtered
          ? <Typography sx={{ color: 'text.secondary', textAlign: 'center', py: 4 }}>No encontramos inscripciones con esa búsqueda.</Typography>
          : <EmptyState icon={HowToRegRounded} title={isPendingTab ? 'Todo al día' : 'Sin historial'} description={isPendingTab ? 'No hay solicitudes pendientes.' : 'Todavía no se resolvió ninguna solicitud.'} />
      )}

      {items.length > 0 && (
        <Stack spacing={1.5} sx={{ opacity: loading ? 0.6 : 1 }}>
          {items.map((inscription) => (
            <InscriptionCard
              key={inscription.id}
              inscription={inscription}
              busy={busyId === inscription.id}
              onApprove={handleApprove}
              onReject={(item) => setRejecting({ inscription: item, reason: '' })}
            />
          ))}
        </Stack>
      )}

      {result && result.totalPages > 1 && (
        <Stack sx={{ alignItems: 'center', mt: 3 }}>
          <Pagination count={result.totalPages} page={result.page} onChange={(event, page) => setQuery((current) => ({ ...current, page }))} color="secondary" />
        </Stack>
      )}

      <Dialog open={Boolean(rejecting)} onClose={busyId ? undefined : () => setRejecting(null)} fullWidth maxWidth="sm">
        {rejecting && (
          <>
            <DialogTitle>¿Rechazar la inscripción de {rejecting.inscription.member.name}?</DialogTitle>
            <DialogContent>
              <DialogContentText sx={{ mb: 2 }}>
                Le va a llegar un aviso con el motivo, si lo escribís. Después puede volver a pedirla.
              </DialogContentText>
              <TextField
                label="Motivo (opcional)"
                value={rejecting.reason}
                onChange={(event) => setRejecting((current) => ({ ...current, reason: event.target.value }))}
                multiline
                minRows={3}
                fullWidth
                autoFocus
                slotProps={{ htmlInput: { maxLength: REASON_MAX } }}
                helperText={`${rejecting.reason.length}/${REASON_MAX}`}
              />
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
              <Button color="secondary" onClick={() => setRejecting(null)} disabled={Boolean(busyId)}>Volver</Button>
              <Button variant="contained" color="secondary" onClick={handleReject} loading={Boolean(busyId)}>Rechazar</Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      <Snackbar open={notice.open} autoHideDuration={8000} onClose={closeNotice} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert
          severity={notice.severity}
          variant="filled"
          onClose={closeNotice}
          action={notice.withLink ? (
            <Button component={RouterLink} to="/leagues" color="inherit" size="small" onClick={closeNotice}>Asignarla a una categoría</Button>
          ) : undefined}
        >
          {notice.message}
        </Alert>
      </Snackbar>
    </>
  )
}
