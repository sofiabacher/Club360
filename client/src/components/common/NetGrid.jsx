import Box from '@mui/material/Box'
import { alpha } from '@mui/material/styles'

// Textura "trama de red" (moodboard): cuadrícula fina con un borde superior Marino, como la cinta de la red.
// Se usa de fondo para las grillas de accesos.
export default function NetGrid({ children, cellSize = 22, sx }) {
  return (
    <Box
      sx={[
        (theme) => {
          const line = alpha(theme.palette.navy.main, 0.08)

          return {
            borderTop: `6px solid ${theme.palette.navy.main}`,
            borderRadius: `${theme.shape.borderRadius}px`,
            bgcolor: 'background.paper',
            backgroundImage: `linear-gradient(${line} 1px, transparent 1px), linear-gradient(90deg, ${line} 1px, transparent 1px)`,
            backgroundSize: `${cellSize}px ${cellSize}px`,
            p: { xs: 2, sm: 3 }
          }
        },
        ...(Array.isArray(sx) ? sx : [sx])
      ]}
    >
      {children}
    </Box>
  )
}
