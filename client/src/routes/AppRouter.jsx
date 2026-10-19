import { Navigate, Route, Routes } from 'react-router-dom'

import PermissionRoute from './PermissionRoute.jsx'
import PublicRoute from './PublicRoute.jsx'
import LoginPage from '../pages/auth/LoginPage.jsx'
import RegisterMemberPage from '../pages/auth/RegisterMemberPage.jsx'
import SelectRolePage from '../pages/auth/SelectRolePage.jsx'
import HomePage from '../pages/HomePage.jsx'

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><RegisterMemberPage /></PublicRoute>} />

      <Route
        path="/select-role"
        element={
          <PermissionRoute requireActiveRole={false}>
            <SelectRolePage />
          </PermissionRoute>
        }
      />

      <Route path="/" element={<PermissionRoute><HomePage /></PermissionRoute>} />

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
