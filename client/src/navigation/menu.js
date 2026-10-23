// Menú del dashboard: única configuración de las secciones del sistema.
//
// IMPORTANTE: toda pantalla nueva se agrega acá con su permiso, y su ruta va en routes/AppRouter.jsx protegida con
// PermissionRoute y el mismo permiso (las rutas de estas entradas ya se generan solas recorriendo este archivo).
//
// Cada entrada: { label, path, icon, permission, group }. El menú muestra solo las entradas cuyo permiso está en
// session.permissions (Inicio no lleva permiso: se muestra siempre). Si en un mismo grupo hay dos entradas con el mismo
// label, se muestra la primera que tenga permiso.
import AccountBalanceWalletRounded from '@mui/icons-material/AccountBalanceWalletRounded'
import AdminPanelSettingsRounded from '@mui/icons-material/AdminPanelSettingsRounded'
import AssignmentIndRounded from '@mui/icons-material/AssignmentIndRounded'
import BackupRounded from '@mui/icons-material/BackupRounded'
import BadgeRounded from '@mui/icons-material/BadgeRounded'
import CampaignRounded from '@mui/icons-material/CampaignRounded'
import CategoryRounded from '@mui/icons-material/CategoryRounded'
import EmojiEventsRounded from '@mui/icons-material/EmojiEventsRounded'
import EventRounded from '@mui/icons-material/EventRounded'
import FitnessCenterRounded from '@mui/icons-material/FitnessCenterRounded'
import GroupsRounded from '@mui/icons-material/GroupsRounded'
import HistoryRounded from '@mui/icons-material/HistoryRounded'
import HomeRounded from '@mui/icons-material/HomeRounded'
import HowToRegRounded from '@mui/icons-material/HowToRegRounded'
import ManageAccountsRounded from '@mui/icons-material/ManageAccountsRounded'
import PaymentsRounded from '@mui/icons-material/PaymentsRounded'
import RequestQuoteRounded from '@mui/icons-material/RequestQuoteRounded'
import SettingsRounded from '@mui/icons-material/SettingsRounded'
import SportsRounded from '@mui/icons-material/SportsRounded'
import SportsVolleyballRounded from '@mui/icons-material/SportsVolleyballRounded'
import StadiumRounded from '@mui/icons-material/StadiumRounded'
import VerifiedUserRounded from '@mui/icons-material/VerifiedUserRounded'

// Orden de los grupos en el menú. Inicio va arriba, sin grupo
export const MENU_GROUPS = ['Gestión', 'Deportivo', 'Mi espacio', 'Familia', 'Club', 'Sistema']

export const MENU_ITEMS = [
  { label: 'Inicio', path: '/', icon: HomeRounded, permission: null, group: null },

  { label: 'Socios', path: '/members', icon: GroupsRounded, permission: 'members.manage', group: 'Gestión' },
  { label: 'Staff', path: '/staff', icon: BadgeRounded, permission: 'staff.manage', group: 'Gestión' },
  { label: 'Cuotas', path: '/fees', icon: PaymentsRounded, permission: 'fees.manage', group: 'Gestión' },
  { label: 'Inscripciones', path: '/inscriptions', icon: HowToRegRounded, permission: 'inscriptions.approve', group: 'Gestión' },
  { label: 'Ligas y categorías', path: '/leagues', icon: EmojiEventsRounded, permission: 'leagues.manage', group: 'Gestión' },
  { label: 'Partidos', path: '/games', icon: SportsVolleyballRounded, permission: 'games.manage', group: 'Gestión' },
  { label: 'Cuotas de jugadoras', path: '/fees/players', icon: RequestQuoteRounded, permission: 'fees.viewPlayers', group: 'Gestión' },

  { label: 'Mis categorías', path: '/my-categories', icon: CategoryRounded, permission: 'leagues.viewAssigned', group: 'Deportivo' },
  { label: 'Partidos', path: '/games/assigned', icon: EventRounded, permission: 'games.viewAssigned', group: 'Deportivo' },
  { label: 'Citaciones', path: '/citations', icon: AssignmentIndRounded, permission: 'citations.create', group: 'Deportivo' },
  { label: 'Rutinas', path: '/routines', icon: FitnessCenterRounded, permission: 'routines.manage', group: 'Deportivo' },
  { label: 'Rutinas', path: '/routines/assigned', icon: FitnessCenterRounded, permission: 'routines.viewAssigned', group: 'Deportivo' },

  { label: 'Mis partidos', path: '/my-games', icon: EventRounded, permission: 'games.viewOwn', group: 'Mi espacio' },
  { label: 'Mis citaciones', path: '/my-citations', icon: AssignmentIndRounded, permission: 'citations.respond', group: 'Mi espacio' },
  { label: 'Mi rutina', path: '/my-routine', icon: FitnessCenterRounded, permission: 'routines.viewOwn', group: 'Mi espacio' },
  { label: 'Mis cuotas', path: '/my-fees', icon: PaymentsRounded, permission: 'fees.viewOwn', group: 'Mi espacio' },
  { label: 'Deportes', path: '/my-sports', icon: SportsRounded, permission: 'inscriptions.request', group: 'Mi espacio' },

  { label: 'Partidos', path: '/family/games', icon: EventRounded, permission: 'games.viewLinked', group: 'Familia' },
  { label: 'Citaciones', path: '/family/citations', icon: AssignmentIndRounded, permission: 'citations.viewLinked', group: 'Familia' },
  { label: 'Estado de cuenta', path: '/family/fees', icon: AccountBalanceWalletRounded, permission: 'fees.manageLinked', group: 'Familia' },

  { label: 'El club', path: '/club', icon: StadiumRounded, permission: 'clubs.viewInfo', group: 'Club' },
  { label: 'Configuración del club', path: '/club/settings', icon: SettingsRounded, permission: 'clubs.manageSettings', group: 'Club' },
  { label: 'Deportes del club', path: '/club/sports', icon: SportsVolleyballRounded, permission: 'clubs.manageSports', group: 'Club' },
  { label: 'Enviar avisos', path: '/notifications/send', icon: CampaignRounded, permission: 'notifications.sendAll', group: 'Club' },
  { label: 'Enviar avisos', path: '/notifications/send', icon: CampaignRounded, permission: 'notifications.sendSport', group: 'Club' },
  { label: 'Enviar avisos', path: '/notifications/send', icon: CampaignRounded, permission: 'notifications.sendCategory', group: 'Club' },

  { label: 'Roles y permisos', path: '/access/roles', icon: AdminPanelSettingsRounded, permission: 'access.manageRoles', group: 'Sistema' },
  { label: 'Usuarios y roles', path: '/access/users', icon: ManageAccountsRounded, permission: 'access.assignRoles', group: 'Sistema' },
  { label: 'Bitácora', path: '/logs', icon: HistoryRounded, permission: 'logs.view', group: 'Sistema' },
  { label: 'Integridad de datos', path: '/integrity', icon: VerifiedUserRounded, permission: 'integrity.manage', group: 'Sistema' },
  { label: 'Copias de seguridad', path: '/backup', icon: BackupRounded, permission: 'backup.manage', group: 'Sistema' }
]

// Pantallas que no están en el menú, para el título de la barra superior: [patrón del path, título]
const EXTRA_TITLES = [
  [/^\/account$/, 'Mi cuenta'],
  [/^\/notifications$/, 'Notificaciones'],
  [/^\/members\/new$/, 'Nuevo socio'],
  [/^\/members\/\d+$/, 'Socio'],
  [/^\/members\/\d+\/edit$/, 'Editar socio'],
  [/^\/members\/\d+\/receipt$/, 'Comprobante de alta']
]

// Entradas que puede ver el usuario con sus permisos, sin repetir label dentro de un grupo
export function getVisibleMenu(permissions) {
  const seen = new Set()

  return MENU_ITEMS.filter((item) => {
    if (item.permission && !permissions.includes(item.permission)) return false

    const key = `${item.group}|${item.label}`
    if (seen.has(key)) return false

    seen.add(key)
    return true
  })
}

// Agrupa las entradas para el menú lateral: [{ group, items }], en el orden de MENU_GROUPS (Inicio primero, con group null)
export function groupMenu(items) {
  return [null, ...MENU_GROUPS]
    .map((group) => ({ group, items: items.filter((item) => item.group === group) }))
    .filter(({ items: groupItems }) => groupItems.length > 0)
}

// Una ruta por path (salvo Inicio), con todos los permisos que la habilitan: alcanza con tener uno.
// Por ejemplo, /notifications/send se habilita con notifications.sendAll, sendSport o sendCategory.
export function getMenuRoutes() {
  const routes = new Map()

  for (const item of MENU_ITEMS) {
    if (!item.permission) continue

    const route = routes.get(item.path) ?? { path: item.path, label: item.label, permissions: [] }
    route.permissions.push(item.permission)
    routes.set(item.path, route)
  }

  return [...routes.values()]
}

// Título de la sección actual: el label de la entrada activa
export function getSectionTitle(pathname, visibleItems) {
  return visibleItems.find((item) => item.path === pathname)?.label
    ?? MENU_ITEMS.find((item) => item.path === pathname)?.label
    ?? EXTRA_TITLES.find(([pattern]) => pattern.test(pathname))?.[1]
    ?? ''
}
