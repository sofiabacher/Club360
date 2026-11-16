import { NavLink } from 'react-router-dom'
import Box from '@mui/material/Box'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'

import AccentStripe from '../common/AccentStripe.jsx'
import BrandLogo from '../common/BrandLogo.jsx'
import { groupMenu } from '../../navigation/menu.js'

// Contenido del menú lateral Pizarra: logo, nombre del club con la franja de su color propio (club.accentColor) y las
// entradas agrupadas, cada una con su ícono. La entrada activa queda resaltada con fondo claro y texto en negrita.
export default function Sidebar({ items, club, onNavigate }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{ px: 3, pt: 3, pb: 2 }}>
        <BrandLogo inverted fontSize="1.6rem" />
        {club?.name && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.75 }}>
            <AccentStripe color={club.accentColor} size={3} sx={{ height: 18, alignSelf: 'center' }} />
            <Typography variant="body2" sx={{ color: 'navy.contrastText', opacity: 0.7 }}>
              {club.name}
            </Typography>
          </Box>
        )}
      </Box>

      <Box component="nav" aria-label="Menú principal" sx={{ flexGrow: 1, overflowY: 'auto', px: 1.5, pb: 3 }}>
        {groupMenu(items).map(({ group, items: groupItems }) => (
          <Box key={group ?? 'home'} sx={{ mt: group ? 2 : 0 }}>
            {group && (
              <Typography
                component="div"
                sx={{
                  px: 1.5,
                  mb: 0.5,
                  fontSize: '0.68rem',
                  fontWeight: 600,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: 'navy.contrastText',
                  opacity: 0.5
                }}
              >
                {group}
              </Typography>
            )}

            <List disablePadding>
              {groupItems.map((item) => (
                <ListItemButton
                  key={item.path}
                  component={NavLink}
                  to={item.path}
                  end
                  onClick={onNavigate}
                  sx={(theme) => ({
                    borderRadius: 1,
                    mb: 0.25,
                    py: 0.75,
                    px: 1.25,
                    color: alpha(theme.palette.navy.contrastText, 0.72),
                    '& .MuiListItemIcon-root': { color: 'inherit', minWidth: 34 },
                    '&:hover': { bgcolor: alpha(theme.palette.common.white, 0.06) },
                    '&.active': {
                      bgcolor: alpha(theme.palette.common.white, 0.1),
                      color: theme.palette.navy.contrastText,
                      '& .MuiListItemText-primary': { fontWeight: 600 }
                    }
                  })}
                >
                  {item.icon && <ListItemIcon><item.icon fontSize="small" /></ListItemIcon>}
                  <ListItemText primary={item.label} slotProps={{ primary: { variant: 'body2' } }} />
                </ListItemButton>
              ))}
            </List>
          </Box>
        ))}
      </Box>
    </Box>
  )
}
