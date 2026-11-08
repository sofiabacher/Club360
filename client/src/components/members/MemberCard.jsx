import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import PersonOutlineRounded from '@mui/icons-material/PersonOutlineRounded'

import AccentStripe from '../common/AccentStripe.jsx'

// Al imprimir, los fondos de color se mantienen (el navegador los saca por defecto)
const keepColors = { printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }

// Carnet del socio como en el moodboard: encabezado Bordó con el nombre del club, la franja del color propio y fondo
// Crema, con la foto (o un ícono), el nombre, "SOCIO Nº 000001" en la variante numeric y una línea debajo (subtitle).
// La usan el comprobante del alta y el panel de inicio de la Jugadora. size: 'medium' o 'small'
export default function MemberCard({ clubName, accentColor, fullName, numMember, subtitle, photoUrl, size = 'medium' }) {
  const small = size === 'small'

  return (
    <Paper elevation={4} sx={{ overflow: 'hidden', borderRadius: 3, bgcolor: 'cream.main', ...keepColors, '@media print': { boxShadow: 'none', border: 1, borderColor: 'divider' } }}>
      <Box sx={{ bgcolor: 'burgundy.main', color: 'burgundy.contrastText', px: small ? 2 : 3, py: small ? 1 : 1.5, ...keepColors }}>
        <Typography sx={{ fontWeight: 600, fontSize: small ? '0.75rem' : '0.85rem', letterSpacing: '0.25em', textTransform: 'uppercase' }}>
          {clubName}
        </Typography>
      </Box>
      <AccentStripe color={accentColor} orientation="horizontal" size={small ? 4 : 6} sx={{ borderRadius: 0 }} />

      <Stack direction="row" spacing={small ? 2 : 2.5} sx={{ alignItems: 'center', px: small ? 2 : 3, py: small ? 2 : 3 }}>
        <Avatar
          src={photoUrl}
          alt={fullName}
          sx={{ width: small ? 56 : 72, height: small ? 56 : 72, bgcolor: 'background.paper', color: 'burgundy.main', border: 2, borderColor: 'burgundy.light', ...keepColors }}
        >
          <PersonOutlineRounded fontSize="large" />
        </Avatar>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h6" component="p" sx={{ color: 'navy.main', overflowWrap: 'anywhere', fontSize: small ? '1.05rem' : undefined }}>{fullName}</Typography>
          <Typography variant="numeric" component="p" sx={{ fontSize: small ? '1.5rem' : '2rem', color: 'navy.main' }}>
            SOCIO Nº {numMember}
          </Typography>
          {subtitle && <Typography variant="body2" sx={{ color: 'text.secondary' }}>{subtitle}</Typography>}
        </Box>
      </Stack>
    </Paper>
  )
}
