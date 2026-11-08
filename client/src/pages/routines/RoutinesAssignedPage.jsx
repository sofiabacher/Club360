import RoutinesWorkspace from '../../components/routines/RoutinesWorkspace.jsx'

// Rutinas de las categorías de la entrenadora (routines.viewAssigned), en solo lectura
export default function RoutinesAssignedPage() {
  return (
    <RoutinesWorkspace
      canEdit={false}
      title="Rutinas"
      description="Las rutinas que cargó la preparadora física para tus categorías."
    />
  )
}
