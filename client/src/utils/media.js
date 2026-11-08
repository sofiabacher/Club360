// URL completa de un archivo subido a la API (por ejemplo, la foto de un usuario: '/uploads/avatars/...').
// Si ya es una URL absoluta (Cloudinary, en producción), queda tal cual
export function getUploadUrl(path) {
  if (!path) return undefined
  if (/^https?:\/\//i.test(path)) return path
  return `${import.meta.env.VITE_API_URL}${path}`
}
