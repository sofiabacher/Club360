class AppError extends Error {
    constructor(message, statusCode = 500, code, data) {
        super(message)
        this.status = statusCode
        this.code = code   // Opcional: identificador para que el front distinga el caso (ej. 'USER_DELETED')
        this.data = data   // Opcional: datos para que el front resuelva el caso (ej. el usuario existente de 'EXISTING_USER')
        this.isOperational = true
        Error.captureStackTrace(this, this.constructor)
    }
}

const createError = (message, statusCode, code, data) => new AppError(message, statusCode, code, data)

module.exports = { AppError, createError }
