import { useState } from 'react'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { format, isValid } from 'date-fns'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Link from '@mui/material/Link'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'

import { registerMember } from '../../api/auth.api.js'
import AuthLayout from '../../components/auth/AuthLayout.jsx'
import PasswordField from '../../components/auth/PasswordField.jsx'
import PasswordRequirements from '../../components/auth/PasswordRequirements.jsx'
import { getErrorMessage, getFieldErrors } from '../../utils/apiErrors.js'

const initialForm = { numMember: '', birthDate: null, username: '', password: '', confirmPassword: '' }

export default function RegisterMemberPage() {
  const navigate = useNavigate()

  const [form, setForm] = useState(initialForm)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  const setField = (name, value) => {
    setForm((current) => ({ ...current, [name]: value }))
    setFieldErrors((current) => ({ ...current, [name]: undefined }))
  }

  const handleChange = (event) => setField(event.target.name, event.target.value)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    if (!isValid(form.birthDate)) {
      setFieldErrors({ birthDate: 'Ingresá tu fecha de nacimiento.' })
      return
    }

    setSubmitting(true)

    try {
      const { data } = await registerMember({ ...form, birthDate: format(form.birthDate, 'yyyy-MM-dd') })
      navigate('/login', { replace: true, state: { registeredUsername: data.username } })
    } catch (err) {
      setError(getErrorMessage(err))
      setFieldErrors(getFieldErrors(err))
      setSubmitting(false)
    }
  }

  const passwordsMatch = form.confirmPassword === '' || form.confirmPassword === form.password

  return (
    <AuthLayout
      title="Primer ingreso"
      subtitle="Con tu número de socio y tu fecha de nacimiento, creá tu usuario y tu contraseña."
      maxWidth={480}
    >
      <Box component="form" onSubmit={handleSubmit} noValidate>
        <Stack spacing={2}>
          {error && <Alert severity="error">{error}</Alert>}

          <TextField
            label="Número de socio"
            name="numMember"
            value={form.numMember}
            onChange={handleChange}
            error={Boolean(fieldErrors.numMember)}
            helperText={fieldErrors.numMember ?? 'Es el número que te dieron en el club al asociarte.'}
            autoFocus
            required
            fullWidth
          />
          <DatePicker
            label="Fecha de nacimiento"
            value={form.birthDate}
            onChange={(value) => setField('birthDate', value)}
            disableFuture
            openTo="year"
            views={['year', 'month', 'day']}
            slotProps={{
              textField: {
                required: true,
                fullWidth: true,
                error: Boolean(fieldErrors.birthDate),
                helperText: fieldErrors.birthDate
              }
            }}
          />
          <TextField
            label="Usuario"
            name="username"
            value={form.username}
            onChange={handleChange}
            error={Boolean(fieldErrors.username)}
            helperText={fieldErrors.username ?? 'De 4 a 50 caracteres: letras, números, punto y guion bajo.'}
            autoComplete="username"
            required
            fullWidth
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
            Registrarme
          </Button>

          <Typography variant="body2" sx={{ textAlign: 'center' }}>
            ¿Ya tenés usuario?{' '}
            <Link component={RouterLink} to="/login" color="secondary" underline="hover" sx={{ fontWeight: 600 }}>
              Iniciá sesión
            </Link>
          </Typography>
        </Stack>
      </Box>
    </AuthLayout>
  )
}
