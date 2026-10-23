import Box from '@mui/material/Box'

// Franja fina con el color propio del club (club.accentColor, decisión D13). Es solo un acento: va junto al nombre del
// club (menú lateral, "El club", carnet de socio). El color llega siempre de la sesión o de la API, nunca escrito a mano.
// orientation: 'vertical' (al costado de un texto) u 'horizontal' (debajo de un encabezado).
export default function AccentStripe({ color, orientation = 'vertical', size = 4, sx }) {
  if (!color) return null

  const vertical = orientation === 'vertical'

  return (
    <Box
      aria-hidden="true"
      sx={[
        {
          bgcolor: color,
          borderRadius: 999,
          flexShrink: 0,
          printColorAdjust: 'exact',
          WebkitPrintColorAdjust: 'exact',
          ...(vertical ? { width: size, alignSelf: 'stretch' } : { height: size, width: '100%' })
        },
        ...(Array.isArray(sx) ? sx : [sx])
      ]}
    />
  )
}
