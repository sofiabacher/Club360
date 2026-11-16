import Box from '@mui/material/Box'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import useAuth from '../../hooks/useAuth.js'

// Encabezado de los paneles de inicio: el saludo, la frase de lo más urgente (o su Skeleton mientras cargan los bloques
// de los que sale) y, a la derecha, la acción principal de la pantalla (el único botón Naranja), si hay
export default function HomeHeader({ phrase, ready = true, action }) {
  const { user } = useAuth()

  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ justifyContent: 'space-between', alignItems: { sm: 'flex-end' }, gap: 2 }}>
      <Box>
        <Typography variant="h4" component="h2" sx={{ color: 'navy.main' }}>Hola, {user.name}</Typography>
        {ready
          ? <Typography sx={{ color: 'text.secondary', mt: 0.5 }}>{phrase}</Typography>
          : <Skeleton variant="text" width={280} />}
      </Box>
      {action && <Box sx={{ flexShrink: 0 }}>{action}</Box>}
    </Stack>
  )
}
