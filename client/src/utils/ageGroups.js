// Textos de los grupos de edad de las categorías. Un grupo es { code, label, minAge, maxAge } (null o sin el campo = sin
// límite), como lo devuelve el back o como está en AGE_SCALES (utils/constants.js)

const ageOf = (value) => (value === null || value === undefined || value === '' ? null : Number(value))

export const hasAgeLimit = (group) => ageOf(group.minAge) !== null || ageOf(group.maxAge) !== null

// "de 40 a 49 años en 2026", "50 años o más en 2026", "hasta 18 años en 2026" o "todas las edades"
export function ageRangeText(group, year) {
  const minAge = ageOf(group.minAge)
  const maxAge = ageOf(group.maxAge)
  if (minAge !== null && maxAge !== null) return `de ${minAge} a ${maxAge} años en ${year}`
  if (minAge !== null) return `${minAge} años o más en ${year}`
  if (maxAge !== null) return `hasta ${maxAge} años en ${year}`
  return 'todas las edades'
}

// "Sub-18 · hasta 18 años en 2026", "+50 · 50 años o más en 2026" o "Mayores · todas las edades"
export const ageGroupText = (group, year) => `${group.label} · ${ageRangeText(group, year)}`

// Etiqueta de un grupo personalizado según sus edades (igual que customAgeLabel del back): "+50", "Sub-16", "40 a 49" o "Libre"
export function customAgeLabel(minAge, maxAge) {
  const min = ageOf(minAge)
  const max = ageOf(maxAge)
  if (min !== null && max !== null) return `${min} a ${max}`
  if (min !== null) return `+${min}`
  if (max !== null) return `Sub-${max}`
  return 'Libre'
}
