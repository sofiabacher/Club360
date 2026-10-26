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
import EditRounded from '@mui/icons-material/EditRounded'
import ForwardToInboxRounded from '@mui/icons-material/ForwardToInboxRounded'
import LockOpenRounded from '@mui/icons-material/LockOpenRounded'
import PersonOffRounded from '@mui/icons-material/PersonOffRounded'
import ReplayRounded from '@mui/icons-material/ReplayRounded'

import {
  deactivateStaff,
  getStaff,
  getStaffOptions,
  reactivateStaff,
  resendActivation,
  unblockStaff
} from '../../api/staff.api.js'
import StaffRolesPicker from '../../components/staff/StaffRolesPicker.jsx'
import StaffStatusChip from '../../components/staff/StaffStatusChip.jsx'
import { getErrorMessage } from '../../utils/apiErrors.js'
import { USER_STATES } from '../../utils/constants.js'
import { formatDate } from '../../utils/format.js'

// Aviso después de reactivar: si volvió sin haber activado nunca su cuenta, se le manda una activación nueva
function reactivatedNotice({ activation }) {
  if (activation.required && activation.sent) return { severity: 'success', message: `Lo reactivamos y le enviamos un email de activación nuevo a ${activation.email}.` }
  if (activation.required) return { severity: 'warning', message: 'Lo reactivamos, pero no pudimos enviar el email de activación. Reenvialo desde acá.' }
  return { severity: 'success', message: 'Lo reactivamos.' }
}

// Acciones que cambian el estado y piden confirmación (la reactivación tiene su propio diálogo, con los roles)
const ACTIONS = {
  deactivate: {
    title: 'Dar de baja del staff',
    text: (staff) => staff.otherRoles.length > 0
      ? `Se le quitan sus roles de staff (${staff.staffRoles.join(', ')}). Como también tiene ${staff.otherRoles.join(', ')}, sigue entrando con ${staff.otherRoles.length === 1 ? 'ese rol' : 'esos roles'}.`
      : `Se le quitan sus roles de staff (${staff.staffRoles.join(', ')}). Como no tiene otros roles, su usuario queda dado de baja y no puede entrar.`,
    confirm: 'Dar de baja',
    request: deactivateStaff,
    done: () => ({ severity: 'success', message: 'Lo dimos de baja del staff.' })
  },
  unblock: {
    title: 'Desbloquear el usuario',
    text: (staff) => `${staff.user.fullName} va a poder volver a iniciar sesión con su contraseña. Se reinician los intentos fallidos.`,
    confirm: 'Desbloquear',
    request: unblockStaff,
    done: () => ({ severity: 'success', message: 'Desbloqueamos el usuario.' })
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

function RoleList({ roles, variant = 'outlined' }) {
  if (roles.length === 0) return null

  return (
    <Stack direction="row" sx={{ gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
      {roles.map((role) => <Chip key={role} label={role} size="small" variant={variant} color={variant === 'outlined' ? 'secondary' : 'default'} />)}
    </Stack>
  )
}

// Detalle de una persona del staff: datos, roles, estados y acciones. Pantalla de staff.manage
export default function StaffDetailPage() {
  const { id } = useParams()
  const location = useLocation()
  const navigate = useNavigate()

  const [staff, setStaff] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [action, setAction] = useState(null)   // Clave de ACTIONS que se está confirmando
  const [running, setRunning] = useState(false)
  const [resending, setResending] = useState(false)
  const [reactivation, setReactivation] = useState(null)   // { options, roles, error } mientras el diálogo está abierto
  const [notice, setNotice] = useState({ open: false, severity: 'success', message: '' })   // Snackbar
  const showNotice = ({ severity, message }) => setNotice({ open: true, severity, message })
  const closeNotice = () => setNotice((current) => ({ ...current, open: false }))

  useEffect(() => {
    getStaff(id)
      .then(({ data }) => setStaff(data))
      .catch((err) => setLoadError(getErrorMessage(err)))
  }, [id])

  // Aviso que dejan el alta y la edición al volver
  useEffect(() => {
    if (location.state?.notice) {
      showNotice(location.state.notice)
      navigate(location.pathname, { replace: true, state: null })
    }
  }, [location, navigate])

  const runAction = async () => {
    const { request, done } = ACTIONS[action]
    setRunning(true)

    try {
      const { data } = await request(id)
      setStaff(data)
      showNotice(done(data))
    } catch (err) {
      showNotice({ severity: 'error', message: getErrorMessage(err) })
    } finally {
      setRunning(false)
      setAction(null)
    }
  }

  const handleResend = async () => {
    setResending(true)

    try {
      const { data } = await resendActivation(id)
      showNotice({ severity: 'success', message: `Le reenviamos el email de activación a ${data.email}.` })
    } catch (err) {
      showNotice({ severity: 'error', message: getErrorMessage(err) })
    } finally {
      setResending(false)
    }
  }

  const openReactivation = async () => {
    try {
      const { data } = await getStaffOptions()
      setReactivation({ options: data.roles, roles: [], error: undefined })
    } catch (err) {
      showNotice({ severity: 'error', message: getErrorMessage(err) })
    }
  }

  const runReactivation = async () => {
    if (reactivation.roles.length === 0) {
      setReactivation((current) => ({ ...current, error: 'Elegí al menos un rol de staff.' }))
      return
    }

    setRunning(true)

    try {
      const { data } = await reactivateStaff(id, reactivation.roles)
      setStaff(data)
      showNotice(reactivatedNotice(data))
      setReactivation(null)
    } catch (err) {
      showNotice({ severity: 'error', message: getErrorMessage(err) })
    } finally {
      setRunning(false)
    }
  }

  if (loadError) return <Alert severity="error">{loadError}</Alert>

  if (!staff) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}>
        <CircularProgress color="secondary" />
      </Box>
    )
  }

  const { user } = staff
  const isBlocked = user.userStateId === USER_STATES.BLOCKED
  const isPendingActivation = staff.isActiveStaff && user.userStateId === USER_STATES.PENDING && !user.isActivated

  return (
    <>
      <Button component={RouterLink} to="/staff" color="secondary" startIcon={<ArrowBackRounded />} sx={{ mb: 2 }}>
        Staff
      </Button>

      <Stack direction={{ xs: 'column', md: 'row' }} sx={{ justifyContent: 'space-between', alignItems: { md: 'flex-start' }, gap: 2, mb: 3 }}>
        <Box>
          <Typography variant="h5" component="h2" sx={{ color: 'navy.main', mb: 1 }}>{user.fullName}</Typography>
          <Stack direction="row" sx={{ gap: 0.75, flexWrap: 'wrap', alignItems: 'center' }}>
            <StaffStatusChip isActiveStaff={staff.isActiveStaff} userStateId={user.userStateId} />
            {staff.staffRoles.map((role) => <Chip key={role} label={role} size="small" variant="outlined" color="secondary" sx={{ fontWeight: 600 }} />)}
          </Stack>
        </Box>

        <Stack direction="row" sx={{ gap: 1, flexWrap: 'wrap' }}>
          {staff.isActiveStaff && (
            <Button component={RouterLink} to={`/staff/${id}/edit`} variant="outlined" color="secondary" startIcon={<EditRounded />}>
              Editar
            </Button>
          )}
          {isPendingActivation && (
            <Button variant="outlined" color="secondary" startIcon={<ForwardToInboxRounded />} onClick={handleResend} loading={resending}>
              Reenviar activación
            </Button>
          )}
          {isBlocked && (
            <Button variant="outlined" color="secondary" startIcon={<LockOpenRounded />} onClick={() => setAction('unblock')}>
              Desbloquear
            </Button>
          )}
          {!staff.isActiveStaff && (
            <Button variant="outlined" color="secondary" startIcon={<ReplayRounded />} onClick={openReactivation}>
              Reactivar
            </Button>
          )}
          {staff.isActiveStaff && (
            <Button variant="outlined" color="error" startIcon={<PersonOffRounded />} onClick={() => setAction('deactivate')}>
              Dar de baja
            </Button>
          )}
        </Stack>
      </Stack>

      {isPendingActivation && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Todavía no activó su cuenta. Si el email no le llegó o el link venció, reenvialo.
        </Alert>
      )}

      {!staff.isActiveStaff && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Es ex staff: no tiene roles de staff. Para que vuelva, reactivalo eligiendo sus roles.
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
                <Grid size={{ xs: 12, sm: 6 }}><Field label="Usuario">{user.username ?? 'Todavía no activó su cuenta'}</Field></Grid>
                <Grid size={{ xs: 12, sm: 6 }}><Field label="Fecha de alta">{formatDate(staff.createdAt)}</Field></Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, lg: 4 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
              <Typography variant="h6" component="h3" sx={{ color: 'navy.main', mb: 2 }}>En el club</Typography>
              <Stack spacing={2}>
                <Field label="Deporte">{staff.clubSport.name}</Field>
                <Field label="Roles de staff">
                  {staff.staffRoles.length > 0 ? <RoleList roles={staff.staffRoles} /> : 'Ninguno (ex staff)'}
                </Field>
                {staff.otherRoles.length > 0 && (
                  <Field label="Otros roles">
                    <RoleList roles={staff.otherRoles} variant="filled" />
                  </Field>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Dialog open={Boolean(action)} onClose={running ? undefined : () => setAction(null)}>
        {action && (
          <>
            <DialogTitle>{ACTIONS[action].title}</DialogTitle>
            <DialogContent>
              <DialogContentText>{ACTIONS[action].text(staff)}</DialogContentText>
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

      <Dialog open={Boolean(reactivation)} onClose={running ? undefined : () => setReactivation(null)}>
        {reactivation && (
          <>
            <DialogTitle>Reactivar en el staff</DialogTitle>
            <DialogContent>
              <DialogContentText sx={{ mb: 2 }}>
                Elegí los roles de staff de {user.fullName}. Si su usuario estaba dado de baja, vuelve a poder entrar
                (o le mandamos un email de activación nuevo, si nunca la activó).
              </DialogContentText>
              <StaffRolesPicker
                options={reactivation.options}
                value={reactivation.roles}
                onChange={(roles) => setReactivation((current) => ({ ...current, roles, error: undefined }))}
                error={reactivation.error}
                disabled={running}
              />
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
              <Button color="secondary" onClick={() => setReactivation(null)} disabled={running}>Cancelar</Button>
              <Button variant="contained" color="secondary" onClick={runReactivation} loading={running}>Reactivar</Button>
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
