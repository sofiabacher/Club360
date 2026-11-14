// Resultados de los partidos (P19): textos y la misma validación del backend (validateResult en games.service.js), para
// mostrar los errores en vivo en el formulario. La regla que vale es la del backend.
import { VALID_SET_RESULTS } from './constants.js'

// Todos los resultados válidos [club, rival], en los dos sentidos
export const VALID_PAIRS = VALID_SET_RESULTS.flatMap(([won, lost]) => [[won, lost], [lost, won]])

export const isValidSetResult = (own, rival) => VALID_PAIRS.some(([a, b]) => a === own && b === rival)

// Sets que se pueden elegir de un lado, según lo elegido del otro (null: cualquiera de un resultado válido)
export function setOptions(other) {
  const values = VALID_PAIRS.filter(([, b]) => other === null || other === '' || b === Number(other)).map(([a]) => a)
  return [...new Set(values)].sort((a, b) => a - b)
}

export const hasResult = (game) => game.ownScore !== null && game.ownScore !== undefined

// "3 – 1"
export const scoreText = (game) => `${game.ownScore} – ${game.rivalScore}`

// "25-20 · 23-25 · 25-18 · 25-21", o '' sin detalle
export const setsText = (setScores) => (setScores?.length > 0 ? setScores.map((set) => `${set.own}-${set.rival}`).join(' · ') : '')

// Chip del resultado: Ganado ok, Perdido overdue
export const outcomeChip = (outcome) => (outcome === 'W' ? { status: 'ok', label: 'Ganado' } : { status: 'overdue', label: 'Perdido' })

// Error de un set (puntos como texto de los campos), o '' si está bien o todavía incompleto
export function setError(set, number) {
  if (set.own === '' || set.rival === '') return ''
  const own = Number(set.own)
  const rival = Number(set.rival)
  if (![own, rival].every((value) => Number.isInteger(value) && value >= 0 && value <= 99)) return `Los puntos del set ${number} tienen que estar entre 0 y 99.`
  if (Math.abs(own - rival) < 2) return `El set ${number} no tiene ganador: tiene que haber al menos 2 puntos de diferencia.`
  return ''
}

// Quién ganó un set ('own', 'rival' o null si está incompleto o no tiene ganador)
export function setWinner(set) {
  if (set.own === '' || set.rival === '' || setError(set, 0)) return null
  return Number(set.own) > Number(set.rival) ? 'own' : 'rival'
}

// Error general de los puntos frente al resultado en sets, o '' (solo con todos los sets completos y sin errores)
export function setsMatchError(sets, ownScore, rivalScore) {
  if (sets.some((set, index) => set.own === '' || set.rival === '' || setError(set, index + 1))) return ''
  const ownSets = sets.filter((set) => setWinner(set) === 'own').length
  if (ownSets !== ownScore || sets.length - ownSets !== rivalScore) {
    return `Los puntos no coinciden con el resultado: con ${ownScore}-${rivalScore}, el club tiene que ganar ${ownScore} ${ownScore === 1 ? 'set' : 'sets'} y el rival ${rivalScore}.`
  }
  return ''
}
