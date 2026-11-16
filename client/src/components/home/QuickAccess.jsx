import { useMemo } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import ButtonBase from '@mui/material/ButtonBase'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import ChevronRightRounded from '@mui/icons-material/ChevronRightRounded'

import useAuth from '../../hooks/useAuth.js'
import { getVisibleMenu, groupMenu } from '../../navigation/menu.js'

// Un acceso: ícono en un círculo, el nombre de la sección y una línea de qué se hace ahí
function Shortcut({ path, label, description, icon: Icon }) {
  return (
    <ButtonBase
      component={RouterLink}
      to={path}
      focusRipple
      sx={{
        width: '100%',
        justifyContent: 'flex-start',
        gap: 1.5,
        p: 1.5,
        borderRadius: 1,
        bgcolor: 'background.paper',
        border: 1,
        borderColor: 'divider',
        textAlign: 'left',
        transition: 'background-color 0.15s, border-color 0.15s',
        '&:hover, &.Mui-focusVisible': { bgcolor: 'action.hover', borderColor: 'secondary.main' },
        '&:hover .shortcut-arrow, &.Mui-focusVisible .shortcut-arrow': { color: 'secondary.main', transform: 'translateX(2px)' }
      }}
    >
      <Avatar variant="rounded" sx={{ bgcolor: 'tint.main', color: 'navy.main', width: 44, height: 44, borderRadius: 1 }}>
        <Icon />
      </Avatar>
      <Box sx={{ minWidth: 0, flexGrow: 1 }}>
        <Typography sx={{ fontWeight: 600, color: 'navy.main', lineHeight: 1.3 }}>{label}</Typography>
        {description && (
          <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.35 }}>{description}</Typography>
        )}
      </Box>
      <ChevronRightRounded className="shortcut-arrow" sx={{ color: 'text.disabled', transition: 'transform 0.2s, color 0.2s' }} />
    </ButtonBase>
  )
}

// Accesos rápidos a las secciones del rol activo, agrupados como en el menú lateral (Gestión, Deportivo, Mi espacio...).
// Van al final de todos los paneles de inicio. Con un solo grupo no se muestra el título del grupo
export default function QuickAccess() {
  const { permissions } = useAuth()
  const groups = useMemo(
    () => groupMenu(getVisibleMenu(permissions).filter((item) => item.path !== '/')),
    [permissions]
  )

  if (groups.length === 0) return null

  return (
    <Box component="section" aria-labelledby="shortcuts-title">
      <Typography id="shortcuts-title" variant="overline" component="h3" sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>
        Accesos rápidos
      </Typography>

      <Stack spacing={2.5}>
        {groups.map(({ group, items }) => (
          <Box key={group ?? 'sin-grupo'}>
            {groups.length > 1 && group && (
              <Typography variant="body2" component="h4" sx={{ fontWeight: 600, color: 'navy.main', mb: 1 }}>{group}</Typography>
            )}
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' },
                gap: 1.5
              }}
            >
              {items.map((item) => <Shortcut key={item.path} {...item} />)}
            </Box>
          </Box>
        ))}
      </Stack>
    </Box>
  )
}
