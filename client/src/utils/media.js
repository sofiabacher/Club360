// URL completa de un archivo subido a la API (por ejemplo, la foto de un usuario: '/uploads/avatars/...')
export function getUploadUrl(path) {
  if (!path) return undefined
  return `${import.meta.env.VITE_API_URL}${path}`
}
