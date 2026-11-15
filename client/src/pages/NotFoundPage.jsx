import { Link as RouterLink } from 'react-router-dom'
import Button from '@mui/material/Button'
import TravelExploreRounded from '@mui/icons-material/TravelExploreRounded'

import EmptyState from '../components/common/EmptyState.jsx'

// Página de una dirección que no existe (dentro del layout: sin sesión, PermissionRoute manda al login)
export default function NotFoundPage() {
  return (
    <EmptyState
      icon={TravelExploreRounded}
      title="No encontramos esta página"
      description="La dirección no existe o cambió. Volvé al inicio para seguir desde ahí."
      action={
        <Button component={RouterLink} to="/" variant="outlined" color="secondary">
          Volver al inicio
        </Button>
      }
    />
  )
}
