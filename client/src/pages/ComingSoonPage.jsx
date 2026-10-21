import { Link as RouterLink } from 'react-router-dom'
import Button from '@mui/material/Button'
import ConstructionRounded from '@mui/icons-material/ConstructionRounded'

import EmptyState from '../components/common/EmptyState.jsx'

// Página de las secciones del menú que todavía no existen
export default function ComingSoonPage({ title }) {
  return (
    <EmptyState
      icon={ConstructionRounded}
      title={title}
      description="Esta sección está en construcción. Muy pronto vas a poder usarla desde acá."
      action={
        <Button component={RouterLink} to="/" variant="outlined" color="secondary">
          Volver al inicio
        </Button>
      }
    />
  )
}
