import Box from '@mui/material/Box'
import { useTheme } from '@mui/material/styles'

// Cancha de vóley vista desde arriba (18 x 9 m): campo naranja con líneas blancas, la red al medio y las líneas de ataque a 3 m.
function VolleyCourt({ fill, line }) {
  return (
    <svg viewBox="0 0 220 120" width="100%" height="100%" aria-hidden="true" focusable="false">
      <rect x="20" y="15" width="180" height="90" fill={fill} stroke={line} strokeWidth="2.5" />
      <line x1="80" y1="15" x2="80" y2="105" stroke={line} strokeWidth="1.5" />
      <line x1="140" y1="15" x2="140" y2="105" stroke={line} strokeWidth="1.5" />
      <line x1="110" y1="5" x2="110" y2="115" stroke={line} strokeWidth="3.5" strokeLinecap="round" />
    </svg>
  )
}

// Fondo "líneas de cancha": Marino con la cancha encima.
// - Por defecto, de pantalla completa (login) con el contenido centrado. En el celular la cancha se pone vertical y se recorta.
// - compact: versión baja para el encabezado de una página, con la cancha recortada a la derecha y el contenido a la izquierda.
// El contenido siempre queda por encima.
export default function CourtBackground({ children, compact = false, sx }) {
  const theme = useTheme()

  if (compact) {
    return (
      <Box sx={[{ position: 'relative', overflow: 'hidden', bgcolor: 'navy.main', borderRadius: 3 }, ...(Array.isArray(sx) ? sx : [sx])]}>
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            right: { xs: -140, sm: -40 },
            aspectRatio: '220 / 120',
            width: 420,
            transform: 'translateY(-50%)',
            pointerEvents: 'none'
          }}
        >
          <VolleyCourt fill={theme.palette.primary.main} line={theme.palette.common.white} />
        </Box>

        <Box sx={{ position: 'relative', zIndex: 1 }}>
          {children}
        </Box>
      </Box>
    )
  }

  return (
    <Box
      sx={{
        position: 'relative',
        minHeight: '100dvh',
        overflow: 'hidden',
        bgcolor: 'navy.main'
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          aspectRatio: '220 / 120',
          width: { xs: '92dvh', md: 'min(1200px, 94vw)' },
          transform: { xs: 'translate(-50%, -50%) rotate(90deg)', md: 'translate(-50%, -50%)' },
          opacity: { xs: 0.85, md: 1 },
          pointerEvents: 'none'
        }}
      >
        <VolleyCourt fill={theme.palette.primary.main} line={theme.palette.common.white} />
      </Box>

      <Box
        sx={{
          position: 'relative',
          zIndex: 1,
          minHeight: '100dvh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          px: 2,
          py: 4
        }}
      >
        {children}
      </Box>
    </Box>
  )
}
