import { Link as RouterLink } from 'react-router-dom'
import Card from '@mui/material/Card'
import CardActionArea from '@mui/material/CardActionArea'
import CardContent from '@mui/material/CardContent'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

// Tarjeta chica de un número del panel (un pendiente o un total) con un link a su pantalla. Carga y falla por separado.
// highlight: si es true y el número es mayor a 0, se pinta en Naranja (algo para atender); si no, en Marino
export default function StatCard({ label, value, to, block, icon: Icon, highlight = true, hint }) {
  const content = (
    <CardContent sx={{ p: 2, height: '100%' }}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
        {block.loading && <Skeleton variant="text" width={60} height={48} />}
        {!block.loading && block.error && <Typography variant="body2" sx={{ color: 'error.main' }}>{block.error}</Typography>}
        {!block.loading && !block.error && (
          <Typography variant="numeric" component="p" sx={{ fontSize: '2.4rem', color: highlight && value > 0 ? 'primary.main' : 'navy.main' }}>
            {value}
          </Typography>
        )}
        {Icon && <Icon sx={{ color: 'text.secondary', opacity: 0.6 }} />}
      </Stack>
      <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>{label}</Typography>
      {hint && !block.loading && !block.error && <Typography variant="caption" sx={{ color: 'text.secondary' }}>{hint}</Typography>}
    </CardContent>
  )

  return (
    <Card sx={{ height: '100%' }}>
      {to ? <CardActionArea component={RouterLink} to={to} sx={{ height: '100%' }}>{content}</CardActionArea> : content}
    </Card>
  )
}
