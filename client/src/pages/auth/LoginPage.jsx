import { useState } from 'react'
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Link from '@mui/material/Link'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import { login } from '../../api/auth.api.js'
import AuthLayout from '../../components/auth/AuthLayout.jsx'
import PasswordField from '../../components/auth/PasswordField.jsx'
import useAuth from '../../hooks/useAuth.js'
import { getErrorMessage } from '../../utils/apiErrors.js'

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { startSession } = useAuth()

  // Si llega desde el registro, trae el usuario recién creado
  const registeredUsername = location.state?.registeredUsername ?? ''

  const [form, setForm] = useState({ username: registeredUsername, password: '' })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

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
    <AuthLayout title="Iniciá sesión" subtitle="Ingresá con tu usuario y tu contraseña.">
      <Box component="form" onSubmit={handleSubmit} noValidate>
        <Stack spacing={2}>
          {registeredUsername && !error && (
            <Alert severity="success">¡Listo, ya te registraste! Ingresá con tu contraseña.</Alert>
          )}
          {error && <Alert severity="error">{error}</Alert>}

          <TextField
            label="Usuario"
            name="username"
            value={form.username}
            onChange={handleChange}
            autoComplete="username"
            autoFocus={!registeredUsername}
            required
            fullWidth
          />
          <PasswordField
            label="Contraseña"
            name="password"
            value={form.password}
            onChange={handleChange}
            autoComplete="current-password"
            autoFocus={Boolean(registeredUsername)}
            required
            fullWidth
          />

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

          <Stack spacing={0.5} sx={{ alignItems: 'center', textAlign: 'center' }}>
            <Typography variant="body2">
              ¿Primer ingreso?{' '}
              <Link component={RouterLink} to="/register" color="secondary" underline="hover" sx={{ fontWeight: 600 }}>
                Registrate con tu número de socio
              </Link>
            </Typography>
            <Button variant="text" color="secondary" size="small" disabled>
              ¿Olvidaste tu contraseña? (próximamente)
            </Button>
          </Stack>
        </Stack>
      </Box>
    </AuthLayout>
  )
}
