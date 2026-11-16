import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

// Encabezado común de las pantallas: título, una línea de descripción y, a la derecha (abajo en el celular), la acción
// principal o los controles de la pantalla. El título de la sección también está en la barra superior (h1)
export default function PageHeader({ title, description, action, sx }) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      sx={[{ justifyContent: 'space-between', alignItems: { sm: 'center' }, gap: 2, mb: 3 }, ...(Array.isArray(sx) ? sx : [sx])]}
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="h5" component="h2" sx={{ color: 'navy.main', overflowWrap: 'anywhere' }}>{title}</Typography>
        {description && (
          <Typography variant="body2" component="div" sx={{ color: 'text.secondary', mt: 0.25, maxWidth: 720 }}>{description}</Typography>
        )}
      </Box>
      {action && (
        <Stack direction="row" sx={{ gap: 1.5, alignItems: 'center', flexWrap: 'wrap', flexShrink: 0 }}>{action}</Stack>
      )}
    </Stack>
  )
}
