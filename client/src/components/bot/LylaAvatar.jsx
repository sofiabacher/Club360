import { useId } from 'react'
import Box from '@mui/material/Box'
import { useTheme } from '@mui/material/styles'

// Avatar de Lyla, la asistente de consultas: una nena con colita y la camiseta del club, dentro de un círculo.
// Decorativo (aria-hidden): el nombre "Lyla" acompaña siempre en el texto. Colores del tema (palette.lyla)
export default function LylaAvatar({ size = 40 }) {
  const { palette } = useTheme()
  const c = palette.lyla
  // Id propio del recorte, por si hay más de un avatar en la pantalla (sin los caracteres que useId agrega)
  const clipId = `lyla-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`

  return (
    <Box
      component="svg"
      viewBox="0 0 40 40"
      aria-hidden="true"
      focusable="false"
      sx={{ width: size, height: size, display: 'block', flexShrink: 0, borderRadius: '50%' }}
    >
      <circle cx="20" cy="20" r="20" fill={c.bg} />
      <clipPath id={clipId}><circle cx="20" cy="20" r="20" /></clipPath>
      <g clipPath={`url(#${clipId})`}>
        {/* Colita y pelo de atrás */}
        <path d="M27.5 12 C35 10.5 37.5 20 33.5 28 C32.5 23 30.5 19.5 27 18.5 Z" fill={c.hair} />
        <circle cx="20" cy="18.5" r="10.5" fill={c.hair} />
        {/* Cuello y camiseta */}
        <rect x="17.5" y="25" width="5" height="6" rx="2" fill={c.skin} />
        <path d="M7 41 C8 33 13 30 20 30 C27 30 32 33 33 41 Z" fill={c.shirt} />
        <path d="M17 30.2 Q20 33 23 30.2" stroke={c.bg} strokeWidth="1.2" fill="none" strokeLinecap="round" />
        {/* Cara */}
        <ellipse cx="20" cy="20.5" rx="8.2" ry="9" fill={c.skin} />
        {/* Flequillo */}
        <path d="M11.6 19.5 C11 12 15.5 8.5 20.5 8.5 C25.5 8.5 29.3 12 28.4 19 C26.5 15.5 23 13.8 18.5 14.2 C15.8 15 13.3 17 11.6 19.5 Z" fill={c.hair} />
        {/* Ojos, mejillas y sonrisa */}
        <circle cx="16.8" cy="21" r="1.1" fill={c.ink} />
        <circle cx="23.2" cy="21" r="1.1" fill={c.ink} />
        <circle cx="15" cy="24" r="1.6" fill={c.cheek} fillOpacity="0.7" />
        <circle cx="25" cy="24" r="1.6" fill={c.cheek} fillOpacity="0.7" />
        <path d="M17.6 25 Q20 27.2 22.4 25" stroke={c.ink} strokeWidth="1.1" fill="none" strokeLinecap="round" />
      </g>
    </Box>
  )
}
