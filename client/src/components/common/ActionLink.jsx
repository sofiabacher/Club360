import { Link as RouterLink } from 'react-router-dom'
import Link from '@mui/material/Link'
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded'

// Link de acción al pie de una tarjeta ("Ver cuotas →"): sin subrayado y con una flecha que se mueve al pasar el mouse.
// El subrayado queda para los links dentro de un párrafo
export default function ActionLink({ to, children, sx }) {
  return (
    <Link
      component={RouterLink}
      to={to}
      color="secondary"
      underline="none"
      sx={[
        {
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.5,
          fontWeight: 600,
          fontSize: '0.875rem',
          '& svg': { transition: 'transform 0.15s' },
          '&:hover svg, &:focus-visible svg': { transform: 'translateX(3px)' }
        },
        ...(Array.isArray(sx) ? sx : [sx])
      ]}
    >
      {children}
      <ArrowForwardRounded sx={{ fontSize: '1rem' }} />
    </Link>
  )
}
