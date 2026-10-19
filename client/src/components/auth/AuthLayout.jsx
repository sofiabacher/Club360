import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'

import BrandLogo from '../common/BrandLogo.jsx'
import CourtBackground from '../common/CourtBackground.jsx'

// Marco de las pantallas de sesión (login, registro, selección de rol): cancha de fondo y una tarjeta blanca centrada.
export default function AuthLayout({ title, subtitle, maxWidth = 440, children }) {
  return (
    <CourtBackground>
      <Card elevation={8} sx={{ width: '100%', maxWidth }}>
        <CardContent sx={{ p: { xs: 3, sm: 4 }, '&:last-child': { pb: { xs: 3, sm: 4 } } }}>
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <BrandLogo fontSize="2.25rem" />
            {title && (
              <Typography variant="h5" component="h1" sx={{ mt: 2, color: 'navy.main' }}>
                {title}
              </Typography>
            )}
            {subtitle && (
              <Typography variant="body2" sx={{ mt: 0.5, color: 'text.secondary' }}>
                {subtitle}
              </Typography>
            )}
          </Box>
          {children}
        </CardContent>
      </Card>
    </CourtBackground>
  )
}
