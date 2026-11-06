// Fechas calculadas en la zona horaria de Argentina, para que no dependan de la zona del servidor (ej. Render en UTC).
const TIME_ZONE = 'America/Argentina/Buenos_Aires'
const ADULT_AGE = 18

// Fecha de hoy en Argentina, como 'AAAA-MM-DD'
function today() {
    return new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE }).format(new Date())   // en-CA da el formato AAAA-MM-DD
}

// Separa una fecha 'AAAA-MM-DD' (como la guarda un DATEONLY) en números
function dateParts(date) {
    const [year, month, day] = String(date).slice(0, 10).split('-').map(Number)
    return { year, month, day }
}

// Edad en años cumplidos, por la fecha completa: si este año todavía no llegó el cumpleaños, se resta uno
function getAge(birthDate) {
    const birth = dateParts(birthDate)
    const now = dateParts(today())

    const hadBirthday = now.month > birth.month || (now.month === birth.month && now.day >= birth.day)
    return now.year - birth.year - (hadBirthday ? 0 : 1)
}

const isAdult = (birthDate) => getAge(birthDate) >= ADULT_AGE

// Año en curso en Argentina
const currentYear = () => dateParts(today()).year

// Edad de temporada (categorías del vóley): año calendario − año de nacimiento, haya cumplido o no.
// En 2026, alguien nacido en 2008 tiene 18 todo el año.
function getSeasonAge(birthDate, year = currentYear()) {
    return year - dateParts(birthDate).year
}

// Partes de una fecha y hora en Argentina, para los textos de los partidos:
// { weekday: 'sábado', weekdayShort: 'sáb.', dayMonth: '7/11', time: '18:30', year: 2026 }
function dateTimeParts(value) {
    const date = new Date(value)
    const part = (options) => new Intl.DateTimeFormat('es-AR', { timeZone: TIME_ZONE, ...options }).format(date)
    const weekday = part({ weekday: 'long' })

    return {
        weekday,
        weekdayShort: `${weekday.slice(0, 3)}.`,
        dayMonth: `${part({ day: 'numeric' })}/${part({ month: 'numeric' })}`,
        time: part({ hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }),
        year: Number(part({ year: 'numeric' }))
    }
}

module.exports = {
    today,
    dateTimeParts,
    getAge,
    isAdult,
    currentYear,
    getSeasonAge
}
