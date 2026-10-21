import { useMemo } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import Box from '@mui/material/Box'
import ButtonBase from '@mui/material/ButtonBase'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import NetGrid from '../components/common/NetGrid.jsx'
import useAuth from '../hooks/useAuth.js'
import { getVisibleMenu } from '../navigation/menu.js'

// Inicio: saludo y accesos rápidos a las secciones disponibles con el rol activo.
// Los dashboards propios de cada rol (próximo partido, citaciones, etc.) se agregan con cada módulo.
export default function HomePage() {
  const { user, club, activeRole, permissions } = useAuth()

  const shortcuts = useMemo(() => getVisibleMenu(permissions).filter((item) => item.path !== '/'), [permissions])

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" component="h2" sx={{ color: 'navy.main' }}>
          Hola, {user.name}
        </Typography>
        <Stack direction="row" spacing={1} sx={{ mt: 1, alignItems: 'center', flexWrap: 'wrap' }}>
          <Typography sx={{ color: 'text.secondary' }}>Estás en el club {club?.name} como</Typography>
          <Chip size="small" label={activeRole?.name} sx={{ fontWeight: 600 }} />
        </Stack>
      </Box>

      {shortcuts.length > 0 && (
        <Box component="section" aria-labelledby="shortcuts-title">
          <Typography
            id="shortcuts-title"
            component="h3"
            sx={{ mb: 1.5, fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'text.secondary' }}
          >
            Accesos rápidos
          </Typography>

          <NetGrid>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(auto-fill, minmax(150px, 1fr))' },
                gap: { xs: 1.5, sm: 2 }
              }}
            >
              {shortcuts.map(({ path, label, icon: Icon }) => (
                <ButtonBase
                  key={path}
                  component={RouterLink}
                  to={path}
                  focusRipple
                  sx={{
                    flexDirection: 'column',
                    gap: 1,
                    minHeight: 112,
                    p: 2,
                    borderRadius: 3,
                    bgcolor: 'background.paper',
                    border: 1,
                    borderColor: 'divider',
                    boxShadow: 1,
                    color: 'navy.main',
                    textAlign: 'center',
                    transition: 'box-shadow 0.2s, border-color 0.2s',
                    '&:hover, &.Mui-focusVisible': { boxShadow: 4, borderColor: 'secondary.main' }
                  }}
                >
                  <Icon sx={{ fontSize: 34 }} />
                  <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                    {label}
                  </Typography>
                </ButtonBase>
              ))}
            </Box>
          </NetGrid>
        </Box>
      )}
    </Stack>
  )
}
