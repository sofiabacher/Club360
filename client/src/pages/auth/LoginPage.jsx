import { useState } from 'react'
import { Link as RouterLink, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import ButtonBase from '@mui/material/ButtonBase'
import Collapse from '@mui/material/Collapse'
import Link from '@mui/material/Link'
import Stack from '@mui/material/Stack'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import ChevronRightRounded from '@mui/icons-material/ChevronRightRounded'
import ExpandMoreRounded from '@mui/icons-material/ExpandMoreRounded'
import MarkEmailReadRounded from '@mui/icons-material/MarkEmailReadRounded'

import { login } from '../../api/auth.api.js'
import AuthLayout from '../../components/auth/AuthLayout.jsx'
import PasswordField from '../../components/auth/PasswordField.jsx'
import useAuth from '../../hooks/useAuth.js'
import { getErrorMessage } from '../../utils/apiErrors.js'

const TABS = { LOGIN: 'login', FIRST: 'primera' }

// Lo que la persona tiene en la mano, dibujado: el número del carnet, el código del comprobante o el email
function Token({ kind }) {
  const box = { width: 96, height: 64, flexShrink: 0, borderRadius: 1, display: 'grid', placeItems: 'center', textAlign: 'center' }

  if (kind === 'member') {
    return (
      <Box sx={{ ...box, bgcolor: 'navy.main', color: 'navy.contrastText' }}>
        <Box>
          <Typography sx={{ fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.12em', opacity: 0.7 }}>SOCIO Nº</Typography>
          <Typography variant="numeric" sx={{ fontSize: '1.35rem', display: 'block' }}>000123</Typography>
        </Box>
      </Box>
    )
  }
  if (kind === 'family') {
    return (
      <Box sx={{ ...box, border: 2, borderStyle: 'dashed', borderColor: 'secondary.main', color: 'navy.main' }}>
        <Typography variant="numeric" sx={{ fontSize: '1.1rem', letterSpacing: '0.06em' }}>ABCD-EFGH</Typography>
      </Box>
    )
  }
  return (
    <Box sx={{ ...box, bgcolor: 'tint.main', color: 'secondary.main' }}>
      <MarkEmailReadRounded sx={{ fontSize: 32 }} />
    </Box>
  )
}

// Una opción del primer ingreso: lo que le dieron en el club, para qué sirve y a dónde lleva. Sin "to", se despliega
// (el staff no tiene una pantalla propia: entra desde el link del email)
function FirstAccessOption({ kind, title, text, to, expanded, onToggle, children }) {
  const common = {
    width: '100%',
    justifyContent: 'flex-start',
    gap: 2,
    p: 1.5,
    textAlign: 'left',
    borderRadius: 1,
    border: 1,
    borderColor: expanded ? 'secondary.main' : 'divider',
    transition: 'border-color 0.15s, background-color 0.15s',
    '&:hover, &.Mui-focusVisible': { borderColor: 'secondary.main', bgcolor: 'action.hover' }
  }
  const content = (
    <>
      <Token kind={kind} />
      <Box sx={{ minWidth: 0, flexGrow: 1 }}>
        <Typography sx={{ fontWeight: 600, color: 'navy.main' }}>{title}</Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>{text}</Typography>
      </Box>
      {to
        ? <ChevronRightRounded sx={{ color: 'text.secondary' }} />
        : <ExpandMoreRounded sx={{ color: 'text.secondary', transition: 'transform 0.2s', transform: expanded ? 'rotate(180deg)' : 'none' }} />}
    </>
  )

  if (to) {
    return <ButtonBase component={RouterLink} to={to} focusRipple sx={common}>{content}</ButtonBase>
  }
  return (
    <Box>
      <ButtonBase onClick={onToggle} focusRipple aria-expanded={expanded} sx={common}>{content}</ButtonBase>
      <Collapse in={expanded}>
        <Box sx={{ px: 2, pt: 1.5, pb: 0.5 }}>{children}</Box>
      </Collapse>
    </Box>
  )
}

// Primer ingreso: cada persona elige según lo que le dieron en el club, y cada opción la lleva a su circuito
function FirstAccess() {
  const [staffOpen, setStaffOpen] = useState(false)

  return (
    <Stack spacing={1.5}>
      <Typography sx={{ fontWeight: 600, color: 'navy.main' }}>¿Qué te dieron en el club?</Typography>
      <FirstAccessOption
        kind="member"
        title="Un número de socio"
        text="Te lo dan en la secretaría al asociarte. Con tu fecha de nacimiento creás tu usuario."
        to="/register"
      />
      <FirstAccessOption
        kind="family"
        title="Un código de vínculo"
        text="Viene en el comprobante del alta de tu jugadora menor. Sirve una sola vez."
        to="/family-link"
      />
      <FirstAccessOption
        kind="staff"
        title="Un email para activar mi cuenta"
        text="Si sos entrenadora, preparadora física o representante."
        expanded={staffOpen}
        onToggle={() => setStaffOpen((open) => !open)}
      >
        <Typography variant="body2">
          Buscá el email <strong>"Activá tu cuenta"</strong> en tu casilla (fijate también en el correo no deseado) y
          tocá el botón: ahí elegís tu usuario y tu contraseña. El link vence a las 48 horas; si venció, pedile al club
          que te lo reenvíe.
        </Typography>
      </FirstAccessOption>

      <Typography variant="body2" sx={{ color: 'text.secondary', pt: 1 }}>
        ¿No tenés ninguno? Para asociarte, acercate a la secretaría de tu club. Si tenés dudas, preguntale al asistente.
      </Typography>
    </Stack>
  )
}

// Inicio de sesión con dos pestañas: "Ya tengo cuenta" (usuario y contraseña) y "Es mi primera vez" (elegir según lo
// que le dieron en el club). ?primera=1 abre la segunda (el botón "Es mi primer ingreso" de la bienvenida)
export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [params, setParams] = useSearchParams()
  const { startSession } = useAuth()

  // Si llega desde el registro o desde el restablecimiento de contraseña, trae el usuario y un mensaje de éxito
  const presetUsername = location.state?.username ?? ''
  const successMessage = location.state?.successMessage ?? ''
  const tab = params.get('primera') === '1' ? TABS.FIRST : TABS.LOGIN

  const [form, setForm] = useState({ username: presetUsername, password: '' })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const changeTab = (event, value) => setParams(value === TABS.FIRST ? { primera: '1' } : {}, { replace: true, state: location.state })
  const handleChange = (event) => setForm({ ...form, [event.target.name]: event.target.value })

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      const { data } = await login(form)
      startSession({ token: data.token, session: data.session })
      navigate(data.requiresRoleSelection ? '/select-role' : '/', { replace: true })
    } catch (err) {
      setError(getErrorMessage(err))
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout
      title={tab === TABS.LOGIN ? 'Iniciá sesión' : 'Primer ingreso'}
      subtitle={tab === TABS.LOGIN ? 'Ingresá con tu usuario y tu contraseña.' : 'Elegí lo que tenés y te guiamos paso a paso.'}
    >
      <Tabs
        value={tab}
        onChange={changeTab}
        variant="fullWidth"
        textColor="secondary"
        indicatorColor="secondary"
        sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab value={TABS.LOGIN} label="Ya tengo cuenta" />
        <Tab value={TABS.FIRST} label="Es mi primera vez" />
      </Tabs>

      {tab === TABS.FIRST ? (
        <FirstAccess />
      ) : (
        <Box component="form" onSubmit={handleSubmit} noValidate>
          <Stack spacing={2}>
            {successMessage && !error && <Alert severity="success">{successMessage}</Alert>}
            {error && <Alert severity="error">{error}</Alert>}

            <TextField
              label="Usuario"
              name="username"
              value={form.username}
              onChange={handleChange}
              autoComplete="username"
              autoFocus={!presetUsername}
              required
              fullWidth
            />
            <Box>
              <PasswordField
                label="Contraseña"
                name="password"
                value={form.password}
                onChange={handleChange}
                autoComplete="current-password"
                autoFocus={Boolean(presetUsername)}
                required
                fullWidth
              />
              <Box sx={{ textAlign: 'right', mt: 0.75 }}>
                <Link component={RouterLink} to="/forgot-password" variant="body2" color="secondary">
                  ¿Olvidaste tu contraseña?
                </Link>
              </Box>
            </Box>

            <Button
              type="submit"
              variant="contained"
              color="primary"
              size="large"
              loading={submitting}
              disabled={!form.username.trim() || !form.password}
              fullWidth
            >
              Ingresar
            </Button>
          </Stack>
        </Box>
      )}
    </AuthLayout>
  )
}
