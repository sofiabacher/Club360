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

// Fecha en Argentina de un momento (Date o ISO), como 'AAAA-MM-DD'
function dateInArgentina(value) {
    return new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE }).format(new Date(value))
}

// 'AAAA-MM-DD' + días → 'AAAA-MM-DD' (en UTC, para que no influya la zona)
function addDays(date, days) {
    const { year, month, day } = dateParts(date)
    return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10)
}

// Día de la semana ISO de una fecha 'AAAA-MM-DD': 1 lunes … 7 domingo
function isoDayOfWeek(date) {
    const { year, month, day } = dateParts(date)
    return new Date(Date.UTC(year, month - 1, day)).getUTCDay() || 7
}

// Lunes de la semana de una fecha, como DATEONLY ('AAAA-MM-DD'). date: 'AAAA-MM-DD' (se toma tal cual) o un momento
// (Date o ISO con hora), que se pasa primero a la fecha de Argentina: el domingo 23:30 en Argentina (lunes 02:30 UTC)
// sigue siendo de esa semana
function getWeekStart(date = new Date()) {
    const day = typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : dateInArgentina(date)
    return addDays(day, 1 - isoDayOfWeek(day))
}

// Lunes de la semana actual en Argentina
const getCurrentWeekStart = () => getWeekStart(today())

// Días entre dos fechas 'AAAA-MM-DD' (to − from). Se calculan en UTC para que no influya la hora ni la zona
function daysBetween(from, to) {
    const toUtc = (date) => {
        const { year, month, day } = dateParts(date)
        return Date.UTC(year, month - 1, day)
    }
    return Math.round((toUtc(to) - toUtc(from)) / (24 * 60 * 60 * 1000))
}

module.exports = {
    today,
    addDays,
    isoDayOfWeek,
    getWeekStart,
    getCurrentWeekStart,
    daysBetween,
    dateTimeParts,
    getAge,
    isAdult,
    currentYear,
    getSeasonAge
}
