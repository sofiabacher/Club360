import { Navigate, Route, Routes } from 'react-router-dom'

import PermissionRoute from './PermissionRoute.jsx'
import PublicRoute from './PublicRoute.jsx'
import DashboardLayout from '../layouts/DashboardLayout.jsx'
import LoginPage from '../pages/auth/LoginPage.jsx'
import RegisterMemberPage from '../pages/auth/RegisterMemberPage.jsx'
import ForgotPasswordPage from '../pages/auth/ForgotPasswordPage.jsx'
import ResetPasswordPage from '../pages/auth/ResetPasswordPage.jsx'
import SelectRolePage from '../pages/auth/SelectRolePage.jsx'
import HomePage from '../pages/HomePage.jsx'
import AccountPage from '../pages/account/AccountPage.jsx'
import ComingSoonPage from '../pages/ComingSoonPage.jsx'
import RolesPage from '../pages/access/RolesPage.jsx'
import UsersRolesPage from '../pages/access/UsersRolesPage.jsx'
import ClubInfoPage from '../pages/clubs/ClubInfoPage.jsx'
import ClubSettingsPage from '../pages/clubs/ClubSettingsPage.jsx'
import ClubSportsPage from '../pages/clubs/ClubSportsPage.jsx'
import MembersPage from '../pages/members/MembersPage.jsx'
import MemberFormPage from '../pages/members/MemberFormPage.jsx'
import MemberDetailPage from '../pages/members/MemberDetailPage.jsx'
import MemberReceiptPage from '../pages/members/MemberReceiptPage.jsx'
import { getMenuRoutes } from '../navigation/menu.js'

// Pantalla de cada path del menú. Mientras una sección no exista, su ruta muestra ComingSoonPage.
// La ruta se protege con el mismo permiso que tiene en navigation/menu.js
const SCREENS = {
  '/members': MembersPage,
  '/club': ClubInfoPage,
  '/club/settings': ClubSettingsPage,
  '/club/sports': ClubSportsPage,
  '/access/roles': RolesPage,
  '/access/users': UsersRolesPage
}

// Pantallas que no están en el menú, con su permiso (el título de la barra está en navigation/menu.js, EXTRA_TITLES)
const EXTRA_SCREENS = [
  { path: '/members/new', permission: 'members.manage', Screen: MemberFormPage },
  { path: '/members/:id', permission: 'members.manage', Screen: MemberDetailPage },
  { path: '/members/:id/edit', permission: 'members.manage', Screen: MemberFormPage },
  { path: '/members/:id/receipt', permission: 'members.manage', Screen: MemberReceiptPage }
]

// Una ruta por path de navigation/menu.js, protegida con sus permisos (alcanza con uno)
const menuRoutes = getMenuRoutes()

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><RegisterMemberPage /></PublicRoute>} />
      <Route path="/forgot-password" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />
      <Route path="/reset-password" element={<PublicRoute><ResetPasswordPage /></PublicRoute>} />

      <Route
        path="/select-role"
        element={
          <PermissionRoute requireActiveRole={false}>
            <SelectRolePage />
          </PermissionRoute>
        }
      />

      {/* Pantallas con sesión y rol activo, dentro del layout del dashboard */}
      <Route element={<PermissionRoute><DashboardLayout /></PermissionRoute>}>
        <Route index element={<HomePage />} />

        <Route
          path="/account"
          element={<PermissionRoute permission="auth.manageAccount"><AccountPage /></PermissionRoute>}
        />
        <Route
          path="/notifications"
          element={<PermissionRoute permission="notifications.view"><ComingSoonPage title="Notificaciones" /></PermissionRoute>}
        />

        {EXTRA_SCREENS.map(({ path, permission, Screen }) => (
          <Route
            key={path}
            path={path}
            element={<PermissionRoute permission={permission}><Screen key={path} /></PermissionRoute>}
          />
        ))}

        {menuRoutes.map(({ path, label, permissions }) => {
          const Screen = SCREENS[path]

          return (
            <Route
              key={path}
              path={path}
              element={
                <PermissionRoute permission={permissions}>
                  {Screen ? <Screen /> : <ComingSoonPage key={path} title={label} />}
                </PermissionRoute>
              }
            />
          )
        })}
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
