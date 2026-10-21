import { useEffect, useState } from 'react'
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Link from '@mui/material/Link'
import Stack from '@mui/material/Stack'

import { resetPassword, validateResetToken } from '../../api/auth.api.js'
import AuthLayout from '../../components/auth/AuthLayout.jsx'
import PasswordField from '../../components/auth/PasswordField.jsx'
import PasswordRequirements from '../../components/auth/PasswordRequirements.jsx'
import { getErrorMessage, getFieldErrors } from '../../utils/apiErrors.js'

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const [status, setStatus] = useState('checking')   // checking | valid | invalid
  const [invalidMessage, setInvalidMessage] = useState('')

  const [form, setForm] = useState({ password: '', confirmPassword: '' })
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  // Antes de mostrar el formulario se valida el link: puede estar vencido o ya usado
  useEffect(() => {
    validateResetToken(token)
      .then(() => setStatus('valid'))
      .catch((err) => {
        setInvalidMessage(getErrorMessage(err))
        setStatus('invalid')
      })
  }, [token])

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
    setFieldErrors((current) => ({ ...current, [name]: undefined }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      const { data } = await resetPassword({ token, ...form })
      navigate('/login', {
        replace: true,
        state: { username: data.username, successMessage: 'Listo, ya cambiaste tu contraseña. Ingresá con la nueva.' }
      })
    } catch (err) {
      setError(getErrorMessage(err))
      setFieldErrors(getFieldErrors(err))
      setSubmitting(false)
    }
  }

  const passwordsMatch = form.confirmPassword === '' || form.confirmPassword === form.password

  return (
    <AuthLayout title="Elegí una contraseña nueva">
      {status === 'checking' && (
        <Box sx={{ display: 'grid', placeItems: 'center', py: 4 }}>
          <CircularProgress color="secondary" />
        </Box>
      )}

      {status === 'invalid' && (
        <Stack spacing={2}>
          <Alert severity="error">{invalidMessage}</Alert>
          <Button component={RouterLink} to="/forgot-password" variant="contained" color="primary" size="large" fullWidth>
            Pedir un link nuevo
          </Button>
          <Link component={RouterLink} to="/login" variant="body2" color="secondary" underline="hover" sx={{ alignSelf: 'center' }}>
            Volver al inicio de sesión
          </Link>
        </Stack>
      )}

      {status === 'valid' && (
        <Box component="form" onSubmit={handleSubmit} noValidate>
          <Stack spacing={2}>
            {error && <Alert severity="error">{error}</Alert>}

            <Box>
              <PasswordField
                label="Contraseña nueva"
                name="password"
                value={form.password}
                onChange={handleChange}
                error={Boolean(fieldErrors.password)}
                helperText={fieldErrors.password}
                autoComplete="new-password"
                autoFocus
                required
                fullWidth
              />
              <PasswordRequirements password={form.password} />
            </Box>
            <PasswordField
              label="Repetí la contraseña nueva"
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
              Guardar contraseña
            </Button>
          </Stack>
        </Box>
      )}
    </AuthLayout>
  )
}
