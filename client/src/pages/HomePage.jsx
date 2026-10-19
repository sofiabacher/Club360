import { useNavigate } from 'react-router-dom'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import LogoutRounded from '@mui/icons-material/LogoutRounded'
import SwapHorizRounded from '@mui/icons-material/SwapHorizRounded'

import BrandLogo from '../components/common/BrandLogo.jsx'
import useAuth from '../hooks/useAuth.js'

// Página provisoria hasta que exista el layout del dashboard con su menú
export default function HomePage() {
  const navigate = useNavigate()
  const { user, club, roles, activeRole, permissions, endSession } = useAuth()

  const handleLogout = async () => {
    await endSession()
    navigate('/login', { replace: true })
  }

  return (
    <Box sx={{ minHeight: '100dvh', bgcolor: 'background.default' }}>
      <Box component="header" sx={{ bgcolor: 'navy.main', px: { xs: 2, sm: 4 }, py: 2 }}>
        <BrandLogo inverted fontSize="1.5rem" />
        <Typography variant="body2" sx={{ color: 'common.white', opacity: 0.75 }}>
          Club {club?.name}
        </Typography>
      </Box>

      <Box sx={{ p: { xs: 2, sm: 4 }, maxWidth: 720, mx: 'auto' }}>
        <Card>
          <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
            <Typography variant="h4" component="h1" sx={{ color: 'navy.main' }}>
              Hola, {user.name}
            </Typography>
            <Typography sx={{ mt: 1, color: 'text.secondary' }}>
              Estás en el club <strong>{club?.name}</strong> con el rol <strong>{activeRole?.name}</strong>.
            </Typography>

            <Stack direction="row" spacing={1.5} sx={{ mt: 3, alignItems: 'baseline' }}>
              <Typography variant="numeric" sx={{ fontSize: '2.5rem', color: 'navy.main' }}>
                {permissions.length}
              </Typography>
              <Typography sx={{ color: 'text.secondary' }}>permisos habilitados con este rol</Typography>
            </Stack>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 4 }}>
              {roles.length > 1 && (
                <Button variant="outlined" color="secondary" startIcon={<SwapHorizRounded />} onClick={() => navigate('/select-role')}>
                  Cambiar de rol
                </Button>
              )}
              <Button variant="text" color="secondary" startIcon={<LogoutRounded />} onClick={handleLogout}>
                Cerrar sesión
              </Button>
            </Stack>
          </CardContent>
        </Card>
      </Box>
    </Box>
  )
}
