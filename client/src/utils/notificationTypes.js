// Tipos de notificación en el front: ícono, tono y ruta a la que lleva cada uno.
// Las claves son las de NOTIFICATION_TYPES en api/src/utils/constants.js (que define además qué va por email).
// tone: un estado de StatusChip ('ok', 'pending', 'overdue', 'urgent') para el color del ícono, o null (neutro).
import AssignmentIndRounded from '@mui/icons-material/AssignmentIndRounded'
import CampaignRounded from '@mui/icons-material/CampaignRounded'
import EventAvailableRounded from '@mui/icons-material/EventAvailableRounded'
import EventBusyRounded from '@mui/icons-material/EventBusyRounded'
import EventRounded from '@mui/icons-material/EventRounded'
import FactCheckRounded from '@mui/icons-material/FactCheckRounded'
import FitnessCenterRounded from '@mui/icons-material/FitnessCenterRounded'
import HowToRegRounded from '@mui/icons-material/HowToRegRounded'
import PersonRemoveRounded from '@mui/icons-material/PersonRemoveRounded'
import PaymentsRounded from '@mui/icons-material/PaymentsRounded'
import PersonOffRounded from '@mui/icons-material/PersonOffRounded'
import ReceiptLongRounded from '@mui/icons-material/ReceiptLongRounded'
import ScheduleRounded from '@mui/icons-material/ScheduleRounded'
import SportsRounded from '@mui/icons-material/SportsRounded'
import WarningAmberRounded from '@mui/icons-material/WarningAmberRounded'

import { getMenuRoutes } from '../navigation/menu.js'

// Cuotas: la Familia va a su estado de cuenta; el resto, a sus cuotas
const feesPath = (permissions) => (permissions.includes('fees.manageLinked') ? '/family/fees' : '/my-fees')

// Citaciones y partidos: la jugadora va a los suyos; la Familia (que recibe los avisos de sus jugadoras menores), a los
// de sus jugadoras
const citationsPath = (permissions) => (permissions.includes('citations.respond') ? '/my-citations' : '/family/citations')
const gamesPath = (permissions) => (permissions.includes('games.viewOwn') ? '/my-games' : '/family/games')

export const NOTIFICATION_TYPES = {
  CITATION_NEW: { icon: AssignmentIndRounded, tone: 'urgent', path: citationsPath },
  CITATION_CANCELLED: { icon: PersonRemoveRounded, tone: 'overdue', path: citationsPath },
  CITATION_RESPONSE: { icon: FactCheckRounded, tone: null, path: () => '/citations' },
  CONFLICT_RESOLVED: { icon: EventAvailableRounded, tone: null, path: gamesPath },
  GAME_CANCELLED: { icon: EventBusyRounded, tone: 'overdue', path: gamesPath },
  FEE_OVERDUE: { icon: PaymentsRounded, tone: 'overdue', path: feesPath },
  MEMBER_SUSPENDED: { icon: PersonOffRounded, tone: 'overdue', path: feesPath },
  FEE_DUE_SOON: { icon: ScheduleRounded, tone: 'pending', path: feesPath },
  PAYMENT_REVIEW_REQUEST: { icon: ReceiptLongRounded, tone: 'pending', path: () => '/fees/payments' },
  PAYMENT_RESULT: { icon: ReceiptLongRounded, tone: null, path: feesPath },
  FIXTURE_PUBLISHED: { icon: EventRounded, tone: null, path: gamesPath },
  SCHEDULE_CONFLICT: { icon: WarningAmberRounded, tone: 'urgent', path: () => '/games/assigned' },
  ROUTINE_PUBLISHED: { icon: FitnessCenterRounded, tone: null, path: () => '/my-routine' },
  INSCRIPTION_REQUEST: { icon: HowToRegRounded, tone: 'pending', path: () => '/inscriptions' },
  INSCRIPTION_RESULT: { icon: HowToRegRounded, tone: 'ok', path: () => '/my-sports' },
  SPORT_WITHDRAWAL: { icon: SportsRounded, tone: 'pending', path: () => '/inscriptions' },
  GENERAL: { icon: CampaignRounded, tone: null, path: () => null }
}

const typeOf = (type) => NOTIFICATION_TYPES[type] ?? NOTIFICATION_TYPES.GENERAL

// Permisos de cada ruta del menú (alcanza con uno)
const routePermissions = new Map(getMenuRoutes().map((route) => [route.path, route.permissions]))

// Ruta a la que lleva una notificación con los permisos del rol activo, o null si no tiene o el rol no la tiene disponible
export function getNotificationPath(type, permissions) {
  const path = typeOf(type).path(permissions)
  if (!path) return null

  const required = routePermissions.get(path)
  return required && required.some((name) => permissions.includes(name)) ? path : null
}

// Nombre de cada sección para el botón del detalle: "Ir a mis citaciones"
const SECTION_LABELS = {
  '/my-citations': 'mis citaciones',
  '/my-games': 'mis partidos',
  '/family/citations': 'las citaciones',
  '/family/games': 'los partidos',
  '/my-fees': 'mis cuotas',
  '/family/fees': 'el estado de cuenta',
  '/games/assigned': 'los partidos',
  '/my-routine': 'mi rutina',
  '/my-sports': 'mis deportes',
  '/citations': 'las citaciones',
  '/inscriptions': 'las inscripciones'
}

// Ruta y nombre de la sección de una notificación, o null si no tiene o no está disponible para el rol activo
export function getNotificationTarget(type, permissions) {
  const path = getNotificationPath(type, permissions)
  return path ? { path, label: SECTION_LABELS[path] ?? 'la sección' } : null
}

export const getNotificationIcon = (type) => typeOf(type).icon
export const getNotificationTone = (type) => typeOf(type).tone
