import { Navigate, Route, Routes } from 'react-router-dom'
import Typography from '@mui/material/Typography'

// import PermissionRoute from './PermissionRoute.jsx'
// import FeesPage from '../pages/fees/FeesPage.jsx'

// Página provisoria hasta que existan las páginas reales
function Placeholder({ title }) {
  return (
    <Typography variant="h4" component="h1" sx={{ p: 4 }}>
      {title}
    </Typography>
  )
}

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<Placeholder title="Club360" />} />
      <Route path="/login" element={<Placeholder title="Club360 · Iniciar sesión" />} />

      {/* Ejemplo de ruta protegida por permiso:
      <Route
        path="/fees"
        element={
          <PermissionRoute permission="fees.manage">
            <FeesPage />
          </PermissionRoute>
        }
      />
      */}

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
