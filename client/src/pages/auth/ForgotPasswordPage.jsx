import { useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Link from '@mui/material/Link'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'

import { forgotPassword } from '../../api/auth.api.js'
import AuthLayout from '../../components/auth/AuthLayout.jsx'
import { getErrorMessage } from '../../utils/apiErrors.js'

export default function ForgotPasswordPage() {
  const [identifier, setIdentifier] = useState('')
  const [sentMessage, setSentMessage] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      // El back responde siempre el mismo mensaje, exista o no la cuenta
      const { data } = await forgotPassword(identifier.trim())
      setSentMessage(data.message)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout
      title="¿Olvidaste tu contraseña?"
      subtitle="Ingresá tu usuario o tu email y te mandamos un link para elegir una nueva."
    >
      <Stack spacing={2}>
        {sentMessage ? (
          <Alert severity="success">{sentMessage}</Alert>
        ) : (
          <Box component="form" onSubmit={handleSubmit} noValidate>
            <Stack spacing={2}>
              {error && <Alert severity="error">{error}</Alert>}

              <TextField
                label="Usuario o email"
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                autoComplete="username"
                autoFocus
                required
                fullWidth
              />

              <Button
                type="submit"
                variant="contained"
                color="primary"
                size="large"
                loading={submitting}
                disabled={!identifier.trim()}
                fullWidth
              >
                Enviar link
              </Button>
            </Stack>
          </Box>
        )}

        <Link
          component={RouterLink}
          to="/login"
          variant="body2"
          color="secondary"
          underline="hover"
          sx={{ alignSelf: 'center', fontWeight: 600 }}
        >
          Volver al inicio de sesión
        </Link>
      </Stack>
    </AuthLayout>
  )
}
