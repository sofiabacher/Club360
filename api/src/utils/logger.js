// Bitácora. Uso: await logger({ clubId, userId, roleId }, LOG_ACTIONS.LOGIN_SUCCESS, 'detalle')
// roleId es el rol activo con el que se hizo la acción.
const logger = async ({ clubId, userId, roleId }, action, details) => {
    try {
        const { Log } = require('../models')   // Se requiere acá adentro porque los modelos todavía no existen

        await Log.create({
            clubId,
            userId,
            roleId,
            action: action.message,
            details,
            criticity: action.criticity
        })

    } catch (error) {   // Un fallo de la bitácora nunca corta el flujo
        console.error('Error al registrar en la bitácora:', error.message)
    }
}

module.exports = logger
