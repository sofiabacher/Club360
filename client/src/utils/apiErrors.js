// Lectura de los errores que devuelve la API ({ success: false, message, errors? })

const CONNECTION_ERROR = 'No pudimos conectarnos con el servidor. Probá de nuevo en unos minutos.'

// Mensaje general del error
export function getErrorMessage(error) {
  return error.response?.data?.message ?? CONNECTION_ERROR
}

// Errores de validación campo por campo, como { campo: mensaje }
export function getFieldErrors(error) {
  const errors = error.response?.data?.errors ?? []
  return Object.fromEntries(errors.map(({ field, message }) => [field, message]))
}
