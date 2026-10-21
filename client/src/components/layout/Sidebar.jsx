import { NavLink } from 'react-router-dom'
import Box from '@mui/material/Box'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemText from '@mui/material/ListItemText'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'

import BrandLogo from '../common/BrandLogo.jsx'
import { groupMenu } from '../../navigation/menu.js'

// Contenido del menú lateral Marino (moodboard): logo, nombre del club y las entradas agrupadas.
// La entrada activa queda resaltada con fondo claro y un punto.
export default function Sidebar({ items, clubName, onNavigate }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{ px: 3, pt: 3, pb: 2 }}>
        <BrandLogo inverted fontSize="1.6rem" />
        {clubName && (
          <Typography variant="body2" sx={{ mt: 0.5, color: 'navy.contrastText', opacity: 0.7 }}>
            Club {clubName}
          </Typography>
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
                  letterSpacing: '0.14em',
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
                    borderRadius: 2,
                    mb: 0.25,
                    py: 0.75,
                    color: alpha(theme.palette.navy.contrastText, 0.78),
                    '&:hover': { bgcolor: alpha(theme.palette.common.white, 0.06) },
                    '&.active': {
                      bgcolor: alpha(theme.palette.common.white, 0.12),
                      color: theme.palette.navy.contrastText,
                      '& .MuiListItemText-primary': { fontWeight: 600 },
                      '&::before': {
                        content: '""',
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        bgcolor: theme.palette.navy.contrastText,
                        mr: 1.25
                      }
                    }
                  })}
                >
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
