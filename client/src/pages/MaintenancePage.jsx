import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import BuildCircleRounded from '@mui/icons-material/BuildCircleRounded'

import { clearSession } from '../api/axiosClient.js'
import AuthLayout from '../components/auth/AuthLayout.jsx'
import useAuth from '../hooks/useAuth.js'

// Pantalla de mantenimiento: el club está bloqueado por un error de integridad (503 INTEGRITY_LOCK) y el usuario no
// tiene permiso para repararlo ni restaurarlo. La manda acá el interceptor de axiosClient. El token se conserva: cuando
// se repare, "Probar de nuevo" vuelve a la app. Quien tiene otro rol que sí puede trabajar, puede cambiarlo
export default function MaintenancePage() {
  const { isAuthenticated, roles } = useAuth()

  const retry = () => window.location.assign('/')

  const goToLogin = () => {
    clearSession()
    window.location.assign('/login')
  }

  return (
    <AuthLayout title="Sistema en mantenimiento">
      <Stack spacing={2.5} sx={{ alignItems: 'center', textAlign: 'center' }}>
        <BuildCircleRounded sx={{ fontSize: 64, color: 'secondary.main' }} />
        <Typography sx={{ color: 'navy.main' }}>El sistema está en mantenimiento. Probá de nuevo más tarde.</Typography>
        <Alert severity="info" sx={{ textAlign: 'left' }}>
          Estamos revisando los datos del club. Cuando terminemos, vas a poder entrar de nuevo con tu usuario.
        </Alert>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ width: '100%', justifyContent: 'center' }}>
          <Button variant="contained" color="secondary" onClick={retry}>Probar de nuevo</Button>
          {isAuthenticated && roles.length > 1 && (
            <Button variant="outlined" color="secondary" href="/select-role">Cambiar de rol</Button>
          )}
          <Button color="secondary" onClick={goToLogin}>Ir al inicio de sesión</Button>
        </Stack>
      </Stack>
    </AuthLayout>
  )
}
