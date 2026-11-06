// Textos de las superposiciones de horario. gapMinutes son los minutos entre el fin del primer partido (inicio + 2 horas)
// y el inicio del segundo; si es negativo, los partidos se pisan.
import { formatShortDateTime } from './format.js'

// Resumen de un partido: 'Sub-18 vs. Atlético Ribera (sáb. 7/11 18:30)'
export const gameSummary = (game) => `${game.category?.name ?? ''}${game.rival ? ` vs. ${game.rival}` : ''} (${formatShortDateTime(game.dateTime)})`

// El otro partido de un conflicto, visto desde el partido del formulario (thisGameId: su id, o null si es nuevo)
export const otherGameOf = (conflict, thisGameId) => conflict.games.find((game) => game.id !== (thisGameId ?? null)) ?? conflict.games[1]

// Relación entre los dos partidos de un conflicto, contada desde el partido del formulario
export function gapText(conflict, thisGameId) {
  const { gapMinutes } = conflict
  const thisIsFirst = conflict.games[0].id === (thisGameId ?? null)

  if (gapMinutes < 0) {
    return thisIsFirst
      ? `empieza ${-gapMinutes} min antes de que termine este`
      : `este empieza ${-gapMinutes} min antes de que termine ese`
  }

  return thisIsFirst
    ? `empieza ${gapMinutes} min después de que termine este`
    : `este empieza ${gapMinutes} min después de que termine ese`
}

// "Se superponen: el segundo empieza 30 min después de que termina el primero (el margen del club es de 60 min)"
export function overlapText(conflict, margin) {
  const { gapMinutes } = conflict
  const relation = gapMinutes < 0
    ? `el segundo empieza ${-gapMinutes} min antes de que termine el primero`
    : `el segundo empieza ${gapMinutes} min después de que termina el primero`
  return `Se superponen: ${relation} (el margen del club es de ${margin} min)`
}
