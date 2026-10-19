import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'

// Indicador de carga centrado en toda la pantalla (por ejemplo, mientras se recupera la sesión)
export default function FullScreenLoader() {
  return (
    <Box sx={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', bgcolor: 'background.default' }}>
      <CircularProgress color="secondary" />
    </Box>
  )
}
