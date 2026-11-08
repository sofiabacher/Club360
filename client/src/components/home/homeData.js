// Datos de los paneles de inicio, calculados en el front a partir de las respuestas de los endpoints de cada módulo
import { CITATION_STATES, FEE_STATES, GAME_STATES, MEMBER_STATES } from '../../utils/constants.js'

// Pide un bloque del panel: { data, error, loading }. Cada bloque carga y falla por separado
export const initialBlock = { data: null, error: '', loading: true }

// Próximos partidos Programados (desde ahora) de una categoría de /games/mine o /games/linked
export const upcomingGames = (category) => category.games
  .filter((game) => game.gameState === GAME_STATES.SCHEDULED && new Date(game.dateTime) >= new Date())

// El próximo partido entre todas las categorías, o null
export function nextGameOf(categories) {
  return categories
    .flatMap((category) => upcomingGames(category).map((game) => ({ ...game, category: category.category, league: category.league })))
    .sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime))[0] ?? null
}

// Situación de la cuota de un estado de cuenta: { status, label }
export function feeStatusOf(account) {
  const unpaid = account.fees.filter((fee) => fee.feeState !== FEE_STATES.PAID)
  if (unpaid.some((fee) => fee.feeState === FEE_STATES.OVERDUE || fee.overdueDays > 0)) return { status: 'overdue', label: 'Vencida' }
  if (unpaid.length > 0) return { status: 'pending', label: 'Pendiente' }
  return { status: 'ok', label: 'Cuota al día' }
}

export const hasOverdueFee = (account) => feeStatusOf(account).status === 'overdue'
export const hasFeeInReview = (account) => account.fees.some((fee) => fee.inReview)
export const isSuspended = (account) => account.member.memberStateId === MEMBER_STATES.SUSPENDED

// Cuota impaga más vieja que se puede pagar (sin una transferencia en revisión), o null
export const oldestPayableFee = (account) => [...account.fees]
  .reverse()
  .find((fee) => fee.feeState !== FEE_STATES.PAID && !fee.inReview) ?? null

// Estado de la citación de un partido en el inicio: Pendiente urgent, Confirmada ok, Rechazada o Cancelada overdue
export function citationChipOf(citation) {
  switch (citation.citationState) {
    case CITATION_STATES.PENDING: return { status: 'urgent', label: 'Citación pendiente' }
    case CITATION_STATES.CONFIRMED: return { status: 'ok', label: 'Citación confirmada' }
    case CITATION_STATES.AUTO_CONFIRMED: return { status: 'ok', label: 'Citación confirmada (automática)' }
    case CITATION_STATES.REJECTED: return { status: 'overdue', label: 'Citación rechazada' }
    case CITATION_STATES.CANCELLED: return { status: 'overdue', label: 'Citación cancelada' }
    default: return null
  }
}

// La citación de un partido (la que no está cancelada, si hay más de una), o null
export function citationForGame(citations, gameId) {
  const ofGame = citations.filter((citation) => citation.gameId === gameId)
  return ofGame.find((citation) => citation.citationState !== CITATION_STATES.CANCELLED) ?? ofGame[0] ?? null
}
