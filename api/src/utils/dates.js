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

module.exports = {
    today,
    getAge,
    isAdult
}
