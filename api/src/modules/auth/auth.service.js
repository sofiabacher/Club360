// Service de auth: login, registro con número de socio, activación, recuperación de contraseña y cambio de rol activo.
// Lógica de negocio y acceso a modelos. Filtra siempre por el clubId del usuario logueado (nunca el del body),
// registra las acciones relevantes en la bitácora (utils/logger) y lanza los errores con createError (utils/errors).

module.exports = {}
