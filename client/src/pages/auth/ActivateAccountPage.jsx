import { useEffect, useState } from 'react'
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Link from '@mui/material/Link'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import { activateAccount, validateActivationToken } from '../../api/auth.api.js'
import AuthLayout from '../../components/auth/AuthLayout.jsx'
import PasswordField from '../../components/auth/PasswordField.jsx'
import PasswordRequirements from '../../components/auth/PasswordRequirements.jsx'
import { getErrorMessage, getFieldErrors } from '../../utils/apiErrors.js'

// Activación de la cuenta del staff con el link del email (/activate?token=). Elige su usuario y su contraseña
export default function ActivateAccountPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const [status, setStatus] = useState('checking')   // checking | valid | invalid
  const [name, setName] = useState('')
  const [invalidMessage, setInvalidMessage] = useState('')

  const [form, setForm] = useState({ username: '', password: '', confirmPassword: '' })
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  // Antes de mostrar el formulario se valida el link: puede estar vencido o ya usado
  useEffect(() => {
    validateActivationToken(token)
      .then(({ data }) => {
        setName(data.name)
        setStatus('valid')
      })
      .catch((err) => {
        setInvalidMessage(getErrorMessage(err))
        setStatus('invalid')
      })
  }, [token])

  const handleChange = (event) => {
    const { name: field, value } = event.target
    setForm((current) => ({ ...current, [field]: value }))
    setFieldErrors((current) => ({ ...current, [field]: undefined }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      const { data } = await activateAccount({ token, ...form })
      navigate('/login', {
        replace: true,
        state: { username: data.username, successMessage: '¡Listo, ya activaste tu cuenta! Ingresá con tu usuario y tu contraseña.' }
      })
    } catch (err) {
      setError(getErrorMessage(err))
      setFieldErrors(getFieldErrors(err))
      setSubmitting(false)
    }
  }

  const passwordsMatch = form.confirmPassword === '' || form.confirmPassword === form.password

  return (
    <AuthLayout title="Activá tu cuenta" maxWidth={480}>
      {status === 'checking' && (
        <Box sx={{ display: 'grid', placeItems: 'center', py: 4 }}>
          <CircularProgress color="secondary" />
        </Box>
      )}

      {status === 'invalid' && (
        <Stack spacing={2}>
          <Alert severity="error">{invalidMessage}</Alert>
          <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center' }}>
            Si ya activaste tu cuenta, iniciá sesión con tu usuario.
          </Typography>
          <Button component={RouterLink} to="/login" variant="contained" color="primary" size="large" fullWidth>
            Ir a iniciar sesión
          </Button>
        </Stack>
      )}

      {status === 'valid' && (
        <Box component="form" onSubmit={handleSubmit} noValidate>
          <Stack spacing={2}>
            <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center' }}>
              Hola, {name}. Elegí tu usuario y tu contraseña para entrar a Club360.
            </Typography>

            {error && <Alert severity="error">{error}</Alert>}

            <TextField
              label="Usuario"
              name="username"
              value={form.username}
              onChange={handleChange}
              error={Boolean(fieldErrors.username)}
              helperText={fieldErrors.username ?? 'Entre 4 y 50 caracteres: letras, números, punto y guion bajo.'}
              autoComplete="username"
              autoFocus
              required
              fullWidth
              slotProps={{ htmlInput: { maxLength: 50 } }}
            />
            <Box>
              <PasswordField
                label="Contraseña"
                name="password"
                value={form.password}
                onChange={handleChange}
                error={Boolean(fieldErrors.password)}
                helperText={fieldErrors.password}
                autoComplete="new-password"
                required
                fullWidth
              />
              <PasswordRequirements password={form.password} />
            </Box>
            <PasswordField
              label="Repetí la contraseña"
              name="confirmPassword"
              value={form.confirmPassword}
              onChange={handleChange}
              error={!passwordsMatch || Boolean(fieldErrors.confirmPassword)}
              helperText={!passwordsMatch ? 'Las contraseñas no coinciden.' : fieldErrors.confirmPassword}
              autoComplete="new-password"
              required
              fullWidth
            />

            <Button type="submit" variant="contained" color="primary" size="large" loading={submitting} fullWidth>
              Activar mi cuenta
            </Button>

            <Link component={RouterLink} to="/login" variant="body2" color="secondary" underline="hover" sx={{ alignSelf: 'center' }}>
              Volver al inicio de sesión
            </Link>
          </Stack>
        </Box>
      )}
    </AuthLayout>
  )
}
