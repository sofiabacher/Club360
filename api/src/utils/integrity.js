// Dígitos verificadores: el cálculo.
// Se mantienen solos con los hooks de models/integrityHooks.js. El módulo integrity usa estas mismas funciones para verificar.

const EXCLUDED_FIELDS = ['dvh', 'createdAt', 'updatedAt']

// Módulo 11 con pesos 2..7 desde la derecha.
// Cada dígito vale lo que indica; cualquier otro carácter vale su código, para que un cambio en un texto también se detecte.
function mod11(text) {
    let weight = 2
    let sum = 0

    for (let i = text.length - 1; i >= 0; i--) {
        const ch = text[i]
        const value = ch >= '0' && ch <= '9' ? Number(ch) : text.charCodeAt(i)

        sum += value * weight
        weight = weight < 7 ? weight + 1 : 2
    }

    const result = 11 - (sum % 11)
    return result === 11 ? 0 : result
}

// JSON con las claves de los objetos ordenadas, en todos los niveles
function stableStringify(value) {
    if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`

    if (value && typeof value === 'object') {
        const entries = Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
        return `{${entries.join(',')}}`
    }

    return JSON.stringify(value ?? null)
}

// Lleva cada valor a un texto que no depende de cómo llegó el dato.
// Los objetos y arrays (campos JSON) van como JSON con las claves ordenadas, así el DVH no depende del orden en que
// MySQL devuelve las claves.
function toText(value) {
    if (value === null || value === undefined) return ''
    if (value instanceof Date) return value.toISOString()
    if (typeof value === 'boolean') return value ? '1' : '0'
    if (typeof value === 'object') return stableStringify(value)
    return String(value)
}

// DVH: dígito verificador de un registro. Los campos se recorren en el orden de attributeNames, no en el del objeto.
const calculateDVH = (row, attributeNames) => {
    const values = attributeNames
        .filter(name => !EXCLUDED_FIELDS.includes(name))
        .map(name => toText(row[name]))
        .join('')

    return mod11(values)
}

// Campos de un modelo que entran en el DVH, en el orden en que están definidos
const getDVHAttributes = (Model) => Object.keys(Model.rawAttributes).filter(name => !EXCLUDED_FIELDS.includes(name))

// row tiene que ser la fila tal como se lee de la base (raw: true), para que guardar y verificar calculen sobre lo mismo
const computeRowDVH = (Model, row) => calculateDVH(row, getDVHAttributes(Model))

// DVV: dígito verificador de una tabla, a partir de los DVH de todos sus registros (también los dados de baja)
const calculateDVV = (rows) => {
    const dvhList = rows
        .map(row => row.dvh)
        .filter(dvh => typeof dvh === 'number' && !isNaN(dvh))

    if (dvhList.length === 0) return 0

    return mod11(dvhList.join(''))
}

// Lee los DVH de la tabla, siempre en el mismo orden (por clave primaria), y calcula su DVV
const computeTableDVV = async (Model, transaction) => {
    const rows = await Model.findAll({
        attributes: ['dvh'],
        order: Model.primaryKeyAttributes.map(name => [name, 'ASC']),
        raw: true,
        transaction
    })

    return calculateDVV(rows)
}

module.exports = {
    stableStringify,
    calculateDVH,
    getDVHAttributes,
    computeRowDVH,
    calculateDVV,
    computeTableDVV
}
