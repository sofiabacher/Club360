import RoutinesWorkspace from '../../components/routines/RoutinesWorkspace.jsx'

// Rutinas de la preparadora física (routines.manage): carga, edición y borrado de la rutina de cada día en la semana
// actual y las futuras; las pasadas, solo de consulta
export default function RoutinesManagePage() {
  return (
    <RoutinesWorkspace
      canEdit
      title="Rutinas"
      description="Cargá la rutina de cada día de entrenamiento. Al publicarla, les avisamos a las jugadoras de la categoría."
    />
  )
}
