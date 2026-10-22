// Nombre en español de cada módulo del catálogo de permisos, para los títulos de grupo.
// Las descripciones de cada permiso vienen del back (GET /access/permissions).
export const MODULE_LABELS = {
  auth: 'Cuenta',
  notifications: 'Notificaciones',
  access: 'Roles y permisos',
  clubs: 'Club',
  members: 'Socios',
  staff: 'Staff',
  inscriptions: 'Inscripciones',
  fees: 'Cuotas y pagos',
  leagues: 'Ligas y categorías',
  games: 'Partidos',
  citations: 'Citaciones',
  routines: 'Rutinas',
  logs: 'Bitácora',
  integrity: 'Integridad de datos',
  backup: 'Copias de seguridad',
  bot: 'Bot de consultas'
}

export const getModuleLabel = (module) => MODULE_LABELS[module] ?? module
