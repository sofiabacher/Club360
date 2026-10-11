// Dígitos verificadores: solo el cálculo.
// La verificación y el recálculo por tabla van en modules/integrity.

const EXCLUDED_FIELDS = ['dvh', 'createdAt', 'updatedAt']

// Módulo 11 con pesos 2..7 desde la derecha, tomando solo los dígitos del texto
function mod11(text) {
    const digits = text
        .split('')
        .filter(ch => /\d/.test(ch))
        .map(ch => parseInt(ch, 10))

    let weight = 2
    let sum = 0

    for (let i = digits.length - 1; i >= 0; i--) {
        sum += digits[i] * weight
        weight = weight < 7 ? weight + 1 : 2
    }

    const result = 11 - (sum % 11)
    return result === 11 ? 0 : result
}

function toText(value) {
    if (value === null || value === undefined) return ''
    if (value instanceof Date) return value.toISOString()
    return String(value)
}

// DVH: dígito verificador de un registro (objeto plano, ej. instance.toJSON())
const calculateDVH = (row) => {
    const values = Object.keys(row)
        .filter(key => !EXCLUDED_FIELDS.includes(key))
        .sort()   // Orden fijo: el resultado no depende del orden en que lleguen los campos
        .map(key => toText(row[key]))
        .join('')

    return mod11(values)
}

// DVV: dígito verificador de una tabla, a partir de los DVH de sus registros
const calculateDVV = (rows) => {
    const dvhList = rows
        .map(row => row.dvh)
        .filter(dvh => typeof dvh === 'number' && !isNaN(dvh))

    if (dvhList.length === 0) return 0

    return mod11(dvhList.join(''))
}

module.exports = {
    calculateDVH,
    calculateDVV
}
