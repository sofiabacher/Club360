import { useTheme } from '@mui/material/styles'

import VolleyBall from './VolleyBall.jsx'

const NET_LEFT = 60
const NET_RIGHT = 420
const NET_TOP = 126
const NET_BOTTOM = 166
const MESH = 12

// Ilustración de vóley en línea fina, sobre fondo Pizarra: la cancha en perspectiva, la red con su faja, la malla y las
// antenas, y una pelota con su trayectoria. Se usa en el inicio de sesión y en la bienvenida. Decorativa (aria-hidden).
// Los colores salen del tema: líneas blancas translúcidas, las antenas a rayas y la pelota de vóley (VolleyBall)
export default function NetIllustration({ width = '100%' }) {
  const theme = useTheme()
  const line = theme.palette.common.white
  const stripe = theme.palette.error.main

  const verticals = []
  for (let x = NET_LEFT + MESH; x < NET_RIGHT; x += MESH) verticals.push(x)
  const horizontals = []
  for (let y = NET_TOP + 8; y < NET_BOTTOM; y += 8) horizontals.push(y)

  return (
    <svg viewBox="0 0 480 300" width={width} aria-hidden="true" focusable="false" style={{ display: 'block' }}>
      {/* Cancha en perspectiva: líneas de fondo, laterales, central y de ataque */}
      <g stroke={line} strokeOpacity="0.35" strokeWidth="1.5" fill="none" strokeLinejoin="round">
        <polygon points="30,285 450,285 380,175 100,175" />
        <line x1="55" y1="245" x2="425" y2="245" />
        <line x1="74" y1="215" x2="406" y2="215" strokeOpacity="0.55" />
        <line x1="89" y1="192" x2="391" y2="192" />
      </g>

      {/* Postes */}
      <g stroke={line} strokeOpacity="0.8" strokeWidth="3" strokeLinecap="round">
        <line x1={NET_LEFT} y1="222" x2={NET_LEFT} y2="110" />
        <line x1={NET_RIGHT} y1="222" x2={NET_RIGHT} y2="110" />
      </g>

      {/* Malla de la red */}
      <g stroke={line} strokeOpacity="0.28" strokeWidth="1">
        {verticals.map((x) => <line key={`v${x}`} x1={x} y1={NET_TOP} x2={x} y2={NET_BOTTOM} />)}
        {horizontals.map((y) => <line key={`h${y}`} x1={NET_LEFT} y1={y} x2={NET_RIGHT} y2={y} />)}
      </g>
      <line x1={NET_LEFT} y1={NET_BOTTOM} x2={NET_RIGHT} y2={NET_BOTTOM} stroke={line} strokeOpacity="0.6" strokeWidth="1.5" />

      {/* Faja superior */}
      <rect x={NET_LEFT} y={NET_TOP - 8} width={NET_RIGHT - NET_LEFT} height="8" rx="1.5" fill={line} fillOpacity="0.9" />

      {/* Antenas, a rayas */}
      <g strokeWidth="3" strokeLinecap="butt">
        {[82, 398].map((x) => (
          <g key={x}>
            <line x1={x} y1="92" x2={x} y2={NET_BOTTOM} stroke={line} strokeOpacity="0.9" />
            <line x1={x} y1="92" x2={x} y2={NET_BOTTOM} stroke={stripe} strokeDasharray="7 7" />
          </g>
        ))}
      </g>

      {/* Trayectoria y sombra de la pelota */}
      <path d="M150 205 Q 225 10 306 60" stroke={line} strokeOpacity="0.45" strokeWidth="1.5" strokeDasharray="3 6" fill="none" strokeLinecap="round" />
      <ellipse cx="330" cy="255" rx="16" ry="3.5" fill={line} fillOpacity="0.12" />

      {/* Pelota */}
      <VolleyBall x={330} y={64} />
    </svg>
  )
}
