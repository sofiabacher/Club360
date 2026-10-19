import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

// Logo de texto: "Club" en Marino (o en blanco sobre fondo oscuro, con `inverted`) y "360" en Naranja.
export default function BrandLogo({ inverted = false, fontSize = '2rem', sx }) {
  return (
    <Typography
      component="span"
      sx={[
        {
          display: 'inline-block',
          fontWeight: 700,
          fontSize,
          lineHeight: 1,
          letterSpacing: '-0.02em',
          color: inverted ? 'common.white' : 'navy.main'
        },
        ...(Array.isArray(sx) ? sx : [sx])
      ]}
    >
      Club
      <Box component="span" sx={{ color: 'primary.main' }}>
        360
      </Box>
    </Typography>
  )
}
