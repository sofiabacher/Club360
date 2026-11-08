import Alert from '@mui/material/Alert'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

// Tarjeta de un bloque del panel de inicio. Mientras carga, su Skeleton; si falló, su propio error (sin romper el resto
// del panel); si no, el contenido. title: el título del bloque (opcional)
export default function HomeBlock({ title, loading, error, height = 140, children, sx }) {
  return (
    <Card sx={sx}>
      <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
        {title && <Typography variant="overline" component="h3" sx={{ color: 'text.secondary', letterSpacing: 1.5, display: 'block', mb: 0.5 }}>{title}</Typography>}
        {loading && (
          <Stack spacing={1}>
            <Skeleton variant="text" width="60%" />
            <Skeleton variant="rounded" height={height} />
          </Stack>
        )}
        {!loading && error && <Alert severity="error">{error}</Alert>}
        {!loading && !error && children}
      </CardContent>
    </Card>
  )
}
