import { Link as RouterLink } from 'react-router-dom'
import Box from '@mui/material/Box'
import Link from '@mui/material/Link'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import ChatBot from '../bot/ChatBot.jsx'
import BrandLogo from '../common/BrandLogo.jsx'
import CourtIllustration from '../common/CourtIllustration.jsx'

// Panel Pizarra de las pantallas de sesión: en la compu, una columna con el logo, una frase propia (no la de la
// bienvenida) y la pizarra táctica; en el celular, una franja baja con el logo y el link a la bienvenida
function AuthAside() {
  return (
    <>
      <Box
        component="aside"
        sx={{
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: 4,
          bgcolor: 'navy.main',
          color: 'navy.contrastText',
          px: { md: 5, lg: 7 },
          py: 5,
          minHeight: '100dvh',
          position: 'sticky',
          top: 0
        }}
      >
        <BrandLogo inverted fontSize="1.75rem" />
        <Box>
          <Typography variant="overline" sx={{ color: 'primary.light' }}>Hoy en la cancha</Typography>
          <Typography variant="h4" component="p" sx={{ mt: 0.5, maxWidth: 420 }}>Tu jugada empieza acá</Typography>
          <Typography sx={{ mt: 1.5, opacity: 0.75, maxWidth: 420 }}>
            Entrá y fijate qué te toca: el próximo partido, la citación, la rutina de la semana o la cuota del mes.
          </Typography>
          <Box sx={{ mt: 5, maxWidth: 480 }}>
            <CourtIllustration />
          </Box>
        </Box>
        <Link component={RouterLink} to="/welcome" variant="body2" sx={{ color: 'inherit', opacity: 0.7, alignSelf: 'flex-start' }}>
          ¿Qué es Club360?
        </Link>
      </Box>

      <Stack
        component="header"
        direction="row"
        sx={{ display: { xs: 'flex', md: 'none' }, alignItems: 'center', justifyContent: 'space-between', bgcolor: 'navy.main', px: 2, py: 1.5, overflow: 'hidden' }}
      >
        <BrandLogo inverted fontSize="1.5rem" />
        <Link component={RouterLink} to="/welcome" variant="body2" sx={{ color: 'inherit', opacity: 0.8 }}>
          ¿Qué es Club360?
        </Link>
      </Stack>
    </>
  )
}

// Marco de las pantallas de sesión (login, primer ingreso, vínculo familiar, recuperar la contraseña...): el panel
// Pizarra a la izquierda y el formulario sobre blanco. assistant: el asistente público (sin sesión), salvo donde no
// ayuda (elegir rol, mantenimiento)
export default function AuthLayout({ title, subtitle, maxWidth = 440, assistant = true, children }) {
  return (
    <Box
      sx={{
        minHeight: '100dvh',
        display: 'grid',
        gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'minmax(0, 5fr) minmax(0, 6fr)' },
        gridTemplateRows: { xs: 'auto 1fr', md: '1fr' },
        bgcolor: 'background.paper'
      }}
    >
      <AuthAside />

      <Box component="main" sx={{ display: 'flex', alignItems: { md: 'center' }, justifyContent: 'center', px: 2, pt: { xs: 4, md: 6 }, pb: { xs: 12, md: 6 } }}>
        <Box sx={{ width: '100%', maxWidth }}>
          {title && (
            <Typography variant="h4" component="h1" sx={{ color: 'navy.main' }}>
              {title}
            </Typography>
          )}
          {subtitle && (
            <Typography sx={{ mt: 0.75, color: 'text.secondary' }}>
              {subtitle}
            </Typography>
          )}
          <Box sx={{ mt: title || subtitle ? 3 : 0 }}>{children}</Box>
        </Box>
      </Box>

      {assistant && <ChatBot publicMode />}
    </Box>
  )
}
