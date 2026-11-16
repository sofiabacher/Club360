import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

// Estado vacío sobre el fondo de la pantalla, con un borde punteado: ícono, título, texto y una acción opcional
// (por ejemplo, un botón). icon: el componente del ícono (ej. ConstructionRounded), no el elemento.
export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <Box
      sx={{
        border: 1,
        borderStyle: 'dashed',
        borderColor: 'divider',
        borderRadius: 1,
        minHeight: { xs: 280, sm: 320 },
        display: 'grid',
        placeItems: 'center',
        px: { xs: 2, sm: 4 },
        py: { xs: 4, sm: 5 }
      }}
    >
      <Box sx={{ maxWidth: 440, textAlign: 'center' }}>
        {Icon && (
          <Avatar variant="rounded" sx={{ width: 56, height: 56, mx: 'auto', mb: 2, borderRadius: 1, bgcolor: 'tint.main', color: 'navy.main' }}>
            <Icon fontSize="large" />
          </Avatar>
        )}
        <Typography variant="h6" component="h2" sx={{ color: 'navy.main' }}>
          {title}
        </Typography>
        {description && (
          <Typography sx={{ mt: 1, color: 'text.secondary' }}>
            {description}
          </Typography>
        )}
        {action && <Box sx={{ mt: 3 }}>{action}</Box>}
      </Box>
    </Box>
  )
}
