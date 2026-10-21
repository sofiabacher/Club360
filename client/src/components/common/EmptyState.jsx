import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'

import ParquetBackground from './ParquetBackground.jsx'

// Estado vacío sobre la textura de parquet: ícono, título, texto y una acción opcional (por ejemplo, un botón).
// icon: el componente del ícono (ej. ConstructionRounded), no el elemento.
export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <ParquetBackground
      sx={{
        borderRadius: 3,
        minHeight: { xs: 360, sm: 420 },
        display: 'grid',
        placeItems: 'center',
        p: { xs: 2, sm: 4 }
      }}
    >
      <Paper elevation={6} sx={{ p: { xs: 3, sm: 4 }, maxWidth: 440, textAlign: 'center', borderRadius: 3 }}>
        {Icon && (
          <Avatar sx={{ width: 64, height: 64, mx: 'auto', mb: 2, bgcolor: 'cream.main', color: 'navy.main' }}>
            <Icon fontSize="large" />
          </Avatar>
        )}
        <Typography variant="h5" component="h2" sx={{ color: 'navy.main' }}>
          {title}
        </Typography>
        {description && (
          <Typography sx={{ mt: 1, color: 'text.secondary' }}>
            {description}
          </Typography>
        )}
        {action && <Box sx={{ mt: 3 }}>{action}</Box>}
      </Paper>
    </ParquetBackground>
  )
}
