// Menú del dashboard: única configuración de las secciones del sistema.
//
// IMPORTANTE: toda pantalla nueva se agrega acá con su permiso, y su ruta va en routes/AppRouter.jsx protegida con
// PermissionRoute y el mismo permiso (las rutas de estas entradas ya se generan solas recorriendo este archivo).
//
// Cada entrada: { label, description, path, icon, permission, group }. description: una línea para los accesos rápidos. El menú muestra solo las entradas cuyo permiso está en
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
import ManageHistoryRounded from '@mui/icons-material/ManageHistoryRounded'
import PaymentsRounded from '@mui/icons-material/PaymentsRounded'
import PostAddRounded from '@mui/icons-material/PostAddRounded'
import InsightsRounded from '@mui/icons-material/InsightsRounded'
import ReceiptLongRounded from '@mui/icons-material/ReceiptLongRounded'
import RequestQuoteRounded from '@mui/icons-material/RequestQuoteRounded'
import SettingsRounded from '@mui/icons-material/SettingsRounded'
import SportsRounded from '@mui/icons-material/SportsRounded'
import SportsVolleyballRounded from '@mui/icons-material/SportsVolleyballRounded'
import StadiumRounded from '@mui/icons-material/StadiumRounded'
import VerifiedUserRounded from '@mui/icons-material/VerifiedUserRounded'

// Orden de los grupos en el menú. Inicio va arriba, sin grupo
export const MENU_GROUPS = ['Gestión', 'Deportivo', 'Mi espacio', 'Familia', 'Club', 'Sistema']

export const MENU_ITEMS = [
  { label: 'Inicio', description: 'Tu panel con lo más importante', path: '/', icon: HomeRounded, permission: null, group: null },

  { label: 'Socios', description: 'Altas, bajas y datos de los socios', path: '/members', icon: GroupsRounded, permission: 'members.manage', group: 'Gestión' },
  { label: 'Staff', description: 'Entrenadoras, preparadoras y representantes', path: '/staff', icon: BadgeRounded, permission: 'staff.manage', group: 'Gestión' },
  { label: 'Cuotas', description: 'Cuotas del mes y estado de cuenta', path: '/fees', icon: PaymentsRounded, permission: 'fees.manage', group: 'Gestión' },
  { label: 'Pagos', description: 'Pagos y transferencias por revisar', path: '/fees/payments', icon: ReceiptLongRounded, permission: 'fees.manage', group: 'Gestión' },
  { label: 'Cargos eventuales', description: 'Cobros aparte de la cuota: torneos, indumentaria, viajes', path: '/fees/charges', icon: PostAddRounded, permission: 'fees.manage', group: 'Gestión' },
  { label: 'Inscripciones', description: 'Solicitudes para aprobar o rechazar', path: '/inscriptions', icon: HowToRegRounded, permission: 'inscriptions.approve', group: 'Gestión' },
  { label: 'Ligas y categorías', description: 'Ligas, categorías y planteles', path: '/leagues', icon: EmojiEventsRounded, permission: 'leagues.manage', group: 'Gestión' },
  { label: 'Partidos', description: 'Fixture, resultados y superposiciones', path: '/games', icon: SportsVolleyballRounded, permission: 'games.manage', group: 'Gestión' },
  { label: 'Cuotas de jugadoras', description: 'Cómo están las cuotas de las jugadoras', path: '/fees/players', icon: RequestQuoteRounded, permission: 'fees.viewPlayers', group: 'Gestión' },

  { label: 'Mis categorías', description: 'Tus categorías y sus jugadoras', path: '/my-categories', icon: CategoryRounded, permission: 'leagues.viewAssigned', group: 'Deportivo' },
  { label: 'Partidos', description: 'Partidos de tus categorías y conflictos', path: '/games/assigned', icon: EventRounded, permission: 'games.viewAssigned', group: 'Deportivo' },
  { label: 'Citaciones', description: 'Citá jugadoras y seguí las respuestas', path: '/citations', icon: AssignmentIndRounded, permission: 'citations.create', group: 'Deportivo' },
  { label: 'Rutinas', description: 'Cargá las rutinas de cada día', path: '/routines', icon: FitnessCenterRounded, permission: 'routines.manage', group: 'Deportivo' },
  { label: 'Rutinas', description: 'Las rutinas de tus categorías', path: '/routines/assigned', icon: FitnessCenterRounded, permission: 'routines.viewAssigned', group: 'Deportivo' },
  { label: 'Seguimiento', description: 'Cómo cumplen las jugadoras sus rutinas', path: '/routines/tracking', icon: InsightsRounded, permission: 'routines.viewTracking', group: 'Deportivo' },

  { label: 'Mis partidos', description: 'Próximos partidos y resultados', path: '/my-games', icon: EventRounded, permission: 'games.viewOwn', group: 'Mi espacio' },
  { label: 'Mis citaciones', description: 'Confirmá o rechazá tus citaciones', path: '/my-citations', icon: AssignmentIndRounded, permission: 'citations.respond', group: 'Mi espacio' },
  { label: 'Mi rutina', description: 'La rutina del día y tu registro', path: '/my-routine', icon: FitnessCenterRounded, permission: 'routines.viewOwn', group: 'Mi espacio' },
  { label: 'Mi progreso', description: 'Tu cumplimiento, esfuerzo y objetivos', path: '/my-progress', icon: InsightsRounded, permission: 'routines.trackOwn', group: 'Mi espacio' },
  { label: 'Mis cuotas', description: 'Tu estado de cuenta y pagos', path: '/my-fees', icon: PaymentsRounded, permission: 'fees.viewOwn', group: 'Mi espacio' },
  { label: 'Deportes', description: 'Inscripciones a los deportes del club', path: '/my-sports', icon: SportsRounded, permission: 'inscriptions.request', group: 'Mi espacio' },

  { label: 'Partidos', description: 'Partidos de tus jugadoras', path: '/family/games', icon: EventRounded, permission: 'games.viewLinked', group: 'Familia' },
  { label: 'Citaciones', description: 'Citaciones de tus jugadoras', path: '/family/citations', icon: AssignmentIndRounded, permission: 'citations.viewLinked', group: 'Familia' },
  { label: 'Estado de cuenta', description: 'Cuotas de tus jugadoras y pagos', path: '/family/fees', icon: AccountBalanceWalletRounded, permission: 'fees.manageLinked', group: 'Familia' },

  { label: 'El club', description: 'Contacto, horarios y canchas', path: '/club', icon: StadiumRounded, permission: 'clubs.viewInfo', group: 'Club' },
  { label: 'Configuración del club', description: 'Datos, cuota social y plazos del club', path: '/club/settings', icon: SettingsRounded, permission: 'clubs.manageSettings', group: 'Club' },
  { label: 'Deportes del club', description: 'Deportes activos y su cuota', path: '/club/sports', icon: SportsVolleyballRounded, permission: 'clubs.manageSports', group: 'Club' },
  { label: 'Enviar avisos', description: 'Mandá un aviso por la plataforma o email', path: '/notifications/send', icon: CampaignRounded, permission: 'notifications.sendAll', group: 'Club' },
  { label: 'Enviar avisos', description: 'Mandá un aviso por la plataforma o email', path: '/notifications/send', icon: CampaignRounded, permission: 'notifications.sendSport', group: 'Club' },
  { label: 'Enviar avisos', description: 'Mandá un aviso por la plataforma o email', path: '/notifications/send', icon: CampaignRounded, permission: 'notifications.sendCategory', group: 'Club' },
  { label: 'Avisos enviados', description: 'Lo que mandaste y quién lo leyó', path: '/notifications/sent', icon: ManageHistoryRounded, permission: 'notifications.sendAll', group: 'Club' },
  { label: 'Avisos enviados', description: 'Lo que mandaste y quién lo leyó', path: '/notifications/sent', icon: ManageHistoryRounded, permission: 'notifications.sendSport', group: 'Club' },
  { label: 'Avisos enviados', description: 'Lo que mandaste y quién lo leyó', path: '/notifications/sent', icon: ManageHistoryRounded, permission: 'notifications.sendCategory', group: 'Club' },

  { label: 'Roles y permisos', description: 'Roles y qué puede hacer cada uno', path: '/access/roles', icon: AdminPanelSettingsRounded, permission: 'access.manageRoles', group: 'Sistema' },
  { label: 'Usuarios y roles', description: 'Roles y permisos de cada usuario', path: '/access/users', icon: ManageAccountsRounded, permission: 'access.assignRoles', group: 'Sistema' },
  { label: 'Bitácora', description: 'Registro de todo lo que pasa en el sistema', path: '/logs', icon: HistoryRounded, permission: 'logs.view', group: 'Sistema' },
  { label: 'Integridad de datos', description: 'Verificá que los datos no se alteraron', path: '/integrity', icon: VerifiedUserRounded, permission: 'integrity.manage', group: 'Sistema' },
  { label: 'Copias de seguridad', description: 'Copias de los datos del club', path: '/backup', icon: BackupRounded, permission: 'backup.manage', group: 'Sistema' }
]

// Pantallas que no están en el menú, para el título de la barra superior: [patrón del path, título]
const EXTRA_TITLES = [
  [/^\/account$/, 'Mi cuenta'],
  [/^\/notifications$/, 'Notificaciones'],
  [/^\/members\/new$/, 'Nuevo socio'],
  [/^\/members\/\d+$/, 'Socio'],
  [/^\/members\/\d+\/edit$/, 'Editar socio'],
  [/^\/members\/\d+\/receipt$/, 'Comprobante de alta'],
  [/^\/staff\/new$/, 'Nuevo integrante del staff'],
  [/^\/staff\/\d+$/, 'Staff'],
  [/^\/staff\/\d+\/edit$/, 'Editar staff'],
  [/^\/leagues\/categories\/\d+$/, 'Categoría'],
  [/^\/citations\/games\/\d+$/, 'Citaciones del partido'],
  [/^\/fees\/members\/\d+$/, 'Estado de cuenta'],
  [/^\/fees\/payments\/\d+\/voucher$/, 'Comprobante de pago'],
  [/^\/fees\/charges\/\d+$/, 'Cargo eventual']
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
