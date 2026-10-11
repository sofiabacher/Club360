class AppError extends Error {
    constructor(message, statusCode = 500, code) {
        super(message)
        this.status = statusCode
        this.code = code   // Opcional: identificador para que el front distinga el caso (ej. 'USER_DELETED')
        this.isOperational = true
        Error.captureStackTrace(this, this.constructor)
    }
}

const createError = (message, statusCode, code) => new AppError(message, statusCode, code)

module.exports = { AppError, createError }
