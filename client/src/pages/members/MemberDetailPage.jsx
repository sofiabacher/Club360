import { useEffect, useState } from 'react'
import { Link as RouterLink, useLocation, useNavigate, useParams } from 'react-router-dom'
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
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import Grid from '@mui/material/Grid'
import Snackbar from '@mui/material/Snackbar'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import ArrowBackRounded from '@mui/icons-material/ArrowBackRounded'
import BadgeRounded from '@mui/icons-material/BadgeRounded'
import EditRounded from '@mui/icons-material/EditRounded'
import LockOpenRounded from '@mui/icons-material/LockOpenRounded'
import PersonOffRounded from '@mui/icons-material/PersonOffRounded'
import ReplayRounded from '@mui/icons-material/ReplayRounded'

import { deactivateMember, getMember, reactivateMember, unblockMember } from '../../api/members.api.js'
import MemberStatusChips from '../../components/members/MemberStatusChips.jsx'
import { getErrorMessage } from '../../utils/apiErrors.js'
import { MEMBER_STATES, USER_STATES } from '../../utils/constants.js'
import { formatDate } from '../../utils/format.js'

// Acciones que cambian el estado: cada una pide confirmación antes
const ACTIONS = {
  deactivate: {
    title: 'Dar de baja al socio',
    text: (name) => `${name} va a quedar inactivo: pierde los roles Socio y Jugadora, pero conserva su usuario y sus otros roles (por ejemplo, Familia). Sus inscripciones y cuotas no se modifican.`,
    confirm: 'Dar de baja',
    request: deactivateMember,
    done: 'Dimos de baja al socio.'
  },
  reactivate: {
    title: 'Reactivar al socio',
    text: (name) => `${name} vuelve a estar activo y recupera los roles Socio y Jugadora.`,
    confirm: 'Reactivar',
    request: reactivateMember,
    done: 'Reactivamos al socio.'
  },
  unblock: {
    title: 'Desbloquear el usuario',
    text: (name) => `${name} va a poder volver a iniciar sesión con su contraseña. Se reinician los intentos fallidos.`,
    confirm: 'Desbloquear',
    request: unblockMember,
    done: 'Desbloqueamos el usuario.'
  }
}

function Field({ label, children }) {
  return (
    <Box>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>{label}</Typography>
      <Box sx={{ color: 'navy.main', fontWeight: 500, overflowWrap: 'anywhere' }}>{children || '—'}</Box>
    </Box>
  )
}

// Detalle de un socio: datos, estados, vínculo familiar y acciones. Pantalla de members.manage
export default function MemberDetailPage() {
  const { id } = useParams()
  const location = useLocation()
  const navigate = useNavigate()

  const [member, setMember] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [action, setAction] = useState(null)   // Clave de ACTIONS que se está confirmando
  const [running, setRunning] = useState(false)
  const [notice, setNotice] = useState({ open: false, severity: 'success', message: '' })   // Snackbar
  const showNotice = (severity, message) => setNotice({ open: true, severity, message })
  const closeNotice = () => setNotice((current) => ({ ...current, open: false }))

  useEffect(() => {
    getMember(id)
      .then(({ data }) => setMember(data))
      .catch((err) => setLoadError(getErrorMessage(err)))
  }, [id])

  // Aviso que deja la pantalla de edición al volver
  useEffect(() => {
    if (location.state?.notice) {
      showNotice('success', location.state.notice)
      navigate(location.pathname, { replace: true, state: null })
    }
  }, [location, navigate])

  const runAction = async () => {
    const { request, done } = ACTIONS[action]
    setRunning(true)

    try {
      const { data } = await request(id)
      setMember(data)
      showNotice('success', done)
    } catch (err) {
      showNotice('error', getErrorMessage(err))
    } finally {
      setRunning(false)
      setAction(null)
    }
  }

  if (loadError) return <Alert severity="error">{loadError}</Alert>

  if (!member) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}>
        <CircularProgress color="secondary" />
      </Box>
    )
  }

  const { user, family } = member
  const isInactive = member.memberStateId === MEMBER_STATES.INACTIVE
  const isSuspended = member.memberStateId === MEMBER_STATES.SUSPENDED
  const isBlocked = user.userStateId === USER_STATES.BLOCKED

  return (
    <>
      <Button component={RouterLink} to="/members" color="secondary" startIcon={<ArrowBackRounded />} sx={{ mb: 2 }}>
        Socios
      </Button>

      <Stack direction={{ xs: 'column', md: 'row' }} sx={{ justifyContent: 'space-between', alignItems: { md: 'flex-start' }, gap: 2, mb: 3 }}>
        <Box>
          <Typography variant="numeric" component="p" sx={{ fontSize: '1.6rem', color: 'navy.main' }}>
            SOCIO Nº {member.numMember}
          </Typography>
          <Typography variant="h5" component="h2" sx={{ color: 'navy.main', mb: 1 }}>{user.fullName}</Typography>
          <MemberStatusChips memberStateId={member.memberStateId} userStateId={user.userStateId} isMinor={user.isMinor} />
        </Box>

        <Stack direction="row" sx={{ gap: 1, flexWrap: 'wrap' }}>
          <Button component={RouterLink} to={`/members/${id}/edit`} variant="outlined" color="secondary" startIcon={<EditRounded />}>
            Editar
          </Button>
          <Button component={RouterLink} to={`/members/${id}/receipt`} variant="outlined" color="secondary" startIcon={<BadgeRounded />}>
            Ver comprobante
          </Button>
          {isBlocked && (
            <Button variant="outlined" color="secondary" startIcon={<LockOpenRounded />} onClick={() => setAction('unblock')}>
              Desbloquear
            </Button>
          )}
          {isInactive && (
            <Button variant="outlined" color="secondary" startIcon={<ReplayRounded />} onClick={() => setAction('reactivate')}>
              Reactivar
            </Button>
          )}
          {!isInactive && (
            <Button variant="outlined" color="error" startIcon={<PersonOffRounded />} onClick={() => setAction('deactivate')}>
              Dar de baja
            </Button>
          )}
        </Stack>
      </Stack>

      {isSuspended && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          Está suspendido por mora: vuelve a estar activo solo cuando regulariza sus cuotas.
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
              <Typography variant="h6" component="h3" sx={{ color: 'navy.main', mb: 2 }}>Datos personales</Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}><Field label="Nombre">{user.name}</Field></Grid>
                <Grid size={{ xs: 12, sm: 6 }}><Field label="Apellido">{user.lastName}</Field></Grid>
                <Grid size={{ xs: 12, sm: 6 }}><Field label="DNI">{user.dni}</Field></Grid>
                <Grid size={{ xs: 12, sm: 6 }}><Field label="Fecha de nacimiento">{`${formatDate(user.birthDate)} (${user.age} años)`}</Field></Grid>
                <Grid size={{ xs: 12, sm: 6 }}><Field label="Email">{user.email}</Field></Grid>
                <Grid size={{ xs: 12, sm: 6 }}><Field label="Teléfono">{user.phone}</Field></Grid>
                <Grid size={{ xs: 12, sm: 6 }}><Field label="Usuario">{user.username ?? 'Todavía no se registró'}</Field></Grid>
                <Grid size={{ xs: 12, sm: 6 }}><Field label="Fecha de alta">{formatDate(member.createdAt)}</Field></Grid>
                <Grid size={12}>
                  <Field label="Roles">
                    {member.roles.length > 0 && (
                      <Stack direction="row" sx={{ gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
                        {member.roles.map((role) => <Chip key={role.id} label={role.name} size="small" variant="outlined" />)}
                      </Stack>
                    )}
                  </Field>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, lg: 4 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
              <Typography variant="h6" component="h3" sx={{ color: 'navy.main', mb: 2 }}>Vínculo familiar</Typography>

              {family.code && (
                <>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>Código para el adulto responsable (sin usar):</Typography>
                  <Typography variant="numeric" component="p" sx={{ fontSize: '2rem', color: 'navy.main', letterSpacing: '0.08em', my: 1 }}>
                    {family.code}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    Está en el comprobante del alta. Se usa una sola vez.
                  </Typography>
                </>
              )}

              {!family.code && family.adult && (
                <Field label="Adulto responsable vinculado">{family.adult.fullName}</Field>
              )}

              {!family.code && !family.adult && (
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {family.linked ? 'El vínculo ya se usó.' : 'No tiene vínculo familiar: se dio de alta siendo mayor de edad.'}
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Dialog open={Boolean(action)} onClose={running ? undefined : () => setAction(null)}>
        {action && (
          <>
            <DialogTitle>{ACTIONS[action].title}</DialogTitle>
            <DialogContent>
              <DialogContentText>{ACTIONS[action].text(user.fullName)}</DialogContentText>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
              <Button color="secondary" onClick={() => setAction(null)} disabled={running}>Cancelar</Button>
              <Button
                variant="contained"
                color={action === 'deactivate' ? 'error' : 'secondary'}
                onClick={runAction}
                loading={running}
              >
                {ACTIONS[action].confirm}
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
