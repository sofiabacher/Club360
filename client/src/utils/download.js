// Descargas de archivos que vienen de la API con axios (responseType: 'blob', así viajan con el token)

// Nombre del archivo que manda el back en Content-Disposition, o fallback
export function fileNameOf(response, fallback) {
  const header = response.headers?.['content-disposition'] ?? ''
  return /filename="?([^";]+)"?/i.exec(header)?.[1] ?? fallback
}

// Guarda un Blob como archivo en la compu (o el celular) del usuario
export function saveBlob(blob, fileName) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// Si una descarga falla, el cuerpo del error también llega como Blob: se lee el JSON para que getErrorMessage encuentre
// el mensaje
export async function readBlobError(error) {
  const body = error.response?.data
  if (body instanceof Blob) {
    try {
      error.response.data = JSON.parse(await body.text())
    } catch {
      // No era JSON: queda el mensaje general
    }
  }
  return error
}
