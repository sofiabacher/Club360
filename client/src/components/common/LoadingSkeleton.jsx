import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'

// Estado de carga de una pantalla o una lista: bloques grises con la forma de las tarjetas que van a aparecer
export default function LoadingSkeleton({ rows = 4, height = 72 }) {
  return (
    <Stack spacing={1.5} aria-busy="true" aria-label="Cargando">
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} variant="rounded" height={height} sx={{ borderRadius: 3 }} />
      ))}
    </Stack>
  )
}
