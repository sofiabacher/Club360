import { useTheme } from '@mui/material/styles'

import VolleyBall from './VolleyBall.jsx'

// Posiciones de nuestro equipo (mirando a la red, que está a la derecha): adelante 4, 3 y 2; atrás 5, 6 y 1
const PLAYERS = [
  { n: 4, x: 196, y: 82, attacker: true },
  { n: 3, x: 214, y: 150 },
  { n: 2, x: 196, y: 240 },
  { n: 5, x: 104, y: 82 },
  { n: 6, x: 110, y: 162 },
  { n: 1, x: 104, y: 240 }
]
const RIVALS = [[290, 84], [290, 162], [290, 240], [376, 84], [376, 162], [376, 240]]

// Ilustración de las pantallas de sesión: una pizarra táctica de vóley vista desde arriba, en línea fina sobre Pizarra.
// La cancha con la red y las líneas de ataque, las seis posiciones, los rivales marcados con cruces y una jugada
// (recepción, armado y ataque cruzado) con la pelota de vóley. Distinta de NetIllustration (la de la bienvenida).
// Decorativa (aria-hidden); colores del tema
export default function CourtIllustration({ width = '100%' }) {
  const { palette } = useTheme()
  const line = palette.common.white
  const highlight = palette.volley.yellow

  return (
    <svg viewBox="0 0 480 320" width={width} aria-hidden="true" focusable="false" style={{ display: 'block' }}>
      {/* Cancha: contorno, líneas de ataque y zona de saque */}
      <g stroke={line} strokeOpacity="0.4" strokeWidth="1.5" fill="none">
        <rect x="40" y="30" width="400" height="260" rx="2" />
        <line x1="173" y1="30" x2="173" y2="290" strokeDasharray="6 6" />
        <line x1="307" y1="30" x2="307" y2="290" strokeDasharray="6 6" />
        <line x1="22" y1="30" x2="34" y2="30" />
        <line x1="22" y1="290" x2="34" y2="290" />
      </g>

      {/* Red con sus postes */}
      <line x1="240" y1="14" x2="240" y2="306" stroke={line} strokeOpacity="0.9" strokeWidth="3" strokeLinecap="round" />
      <circle cx="240" cy="14" r="4" fill={line} />
      <circle cx="240" cy="306" r="4" fill={line} />

      {/* Rivales */}
      <g stroke={line} strokeOpacity="0.35" strokeWidth="2" strokeLinecap="round">
        {RIVALS.map(([x, y]) => (
          <g key={`${x}-${y}`}>
            <line x1={x - 7} y1={y - 7} x2={x + 7} y2={y + 7} />
            <line x1={x - 7} y1={y + 7} x2={x + 7} y2={y - 7} />
          </g>
        ))}
      </g>

      {/* Jugada: recepción de 6 a la armadora, armado a 4 y ataque cruzado */}
      <g stroke={line} strokeOpacity="0.6" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M126 152 Q160 110 200 132" strokeDasharray="3 6" />
        <polyline points="190,131 200,132 195,123" />
        <path d="M216 134 Q236 96 222 76" strokeDasharray="3 6" />
        <path d="M232 70 Q320 118 378 226" stroke={highlight} strokeOpacity="0.9" strokeWidth="2" />
        <polyline points="368,222 378,228 378.6,216.4" stroke={highlight} strokeOpacity="0.9" strokeWidth="2" />
      </g>

      {/* Nuestras jugadoras, con el número de posición. La atacante, resaltada */}
      {PLAYERS.map(({ n, x, y, attacker }) => (
        <g key={n}>
          <circle
            cx={x}
            cy={y}
            r="15"
            fill={attacker ? highlight : line}
            fillOpacity={attacker ? 0.9 : 0.08}
            stroke={attacker ? highlight : line}
            strokeOpacity="0.85"
            strokeWidth="1.5"
          />
          <text
            x={x}
            y={y}
            dy="0.35em"
            textAnchor="middle"
            fontFamily="inherit"
            fontWeight="600"
            fontSize="14"
            fill={attacker ? palette.navy.main : line}
          >
            {n}
          </text>
        </g>
      ))}

      {/* Pelota, en el punto de ataque */}
      <VolleyBall x={228} y={60} scale={0.55} />
    </svg>
  )
}
