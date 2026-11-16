import { useTheme } from '@mui/material/styles'

// Un panel de la pelota: del centro al borde por una costura curva, un tercio del borde y de vuelta al centro por la
// costura siguiente. Rotado 0°, 120° y 240° arma la pelota entera
const PANEL = 'M0 0 Q4 -12 17.32 -10 A20 20 0 0 1 0 20 Q8.39 9.46 0 0 Z'
const SEAM = 'M0 0 Q4 -12 17.32 -10'
// Costuras internas de cada panel (las tiras de la pelota)
const STRIPS = ['M3 5.5 Q10 -2 19.6 -4', 'M5.5 12.5 Q13 6 19.9 2.2']

// Pelota de vóley de radio 20 (en coordenadas SVG, para usar dentro de un <svg>), con los tres paneles blanco,
// amarillo y azul de las pelotas de competencia. Colores del tema (palette.volley)
export default function VolleyBall({ x = 0, y = 0, scale = 1 }) {
  const { palette } = useTheme()
  const colors = [palette.volley.white, palette.volley.yellow, palette.volley.blue]

  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      {colors.map((color, index) => (
        <path key={color} d={PANEL} fill={color} transform={`rotate(${index * 120})`} />
      ))}
      <g stroke={palette.volley.seam} strokeOpacity="0.55" strokeWidth="1.1" fill="none" strokeLinecap="round">
        {[0, 120, 240].map((angle) => <path key={angle} d={SEAM} transform={`rotate(${angle})`} />)}
      </g>
      <g stroke={palette.volley.seam} strokeOpacity="0.35" strokeWidth="0.9" fill="none" strokeLinecap="round">
        {[0, 120, 240].map((angle) => STRIPS.map((d) => <path key={`${angle}-${d}`} d={d} transform={`rotate(${angle})`} />))}
      </g>
      <circle r="20" fill="none" stroke={palette.volley.seam} strokeOpacity="0.35" strokeWidth="1" />
    </g>
  )
}
