// Seguimiento personal de la jugadora (P20): textos y estados de los registros de rutinas y de los objetivos.
import { GOAL_STATES, ROUTINE_LOG_STATUS } from './constants.js'

// Cada estado del registro: la etiqueta, el estado de color del tema (theme.status) y el símbolo de la grilla
export const LOG_STATUS_INFO = {
  [ROUTINE_LOG_STATUS.COMPLETED]: { label: 'Completada', button: 'Completada', status: 'ok', symbol: '✓' },
  [ROUTINE_LOG_STATUS.PARTIAL]: { label: 'Parcial', button: 'Parcial', status: 'pending', symbol: '◐' },
  [ROUTINE_LOG_STATUS.NOT_COMPLETED]: { label: 'No la hizo', button: 'No la hice', status: 'overdue', symbol: '✕' }
}

export const EFFORT_LABELS = { 1: 'Muy liviano', 5: 'Al máximo' }

export const needsEffort = (status) => status === ROUTINE_LOG_STATUS.COMPLETED || status === ROUTINE_LOG_STATUS.PARTIAL

// Chip de un objetivo: En curso pending, Vencido overdue, Cumplido ok, Abandonado neutral
export function goalChip(goal) {
  if (goal.goalState === GOAL_STATES.ACHIEVED) return { status: 'ok', label: 'Cumplido' }
  if (goal.goalState === GOAL_STATES.ABANDONED) return { status: 'neutral', label: 'Abandonado' }
  if (goal.overdue) return { status: 'overdue', label: 'Vencido' }
  return { status: 'pending', label: 'En curso' }
}

// "75 %" o "—"
export const percentText = (value) => (value === null || value === undefined ? '—' : `${value} %`)

// "3,8" o "—"
export const effortText = (value) => (value === null || value === undefined ? '—' : String(value).replace('.', ','))

// Cumplimiento de la semana de "Mi rutina": (completadas + parciales × 0,5) / rutinas con fecha de hoy o anterior, de
// todas las categorías. null si todavía no hubo rutinas
export function weekComplianceOf(routineData) {
  const due = routineData.categories.flatMap((item) => item.days).filter((day) => day.routine && day.date <= routineData.today)
  if (due.length === 0) return null
  const score = due.reduce((sum, day) => {
    const status = day.routine.myLog?.status
    return sum + (status === ROUTINE_LOG_STATUS.COMPLETED ? 1 : status === ROUTINE_LOG_STATUS.PARTIAL ? 0.5 : 0)
  }, 0)
  return Math.round((score / due.length) * 100)
}

// Rutinas de la semana que todavía se pueden registrar y no tienen registro
export const pendingLogsOf = (routineData) => routineData.categories
  .flatMap((item) => item.days)
  .filter((day) => day.routine?.canLog && !day.routine.myLog)
