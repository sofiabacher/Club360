// Llamadas a la API del módulo integrity: estado del club, verificación, reparación e informe.
// Devuelven el cuerpo de la respuesta: { success, data }.
import axiosClient from './axiosClient.js'
import { fileNameOf, readBlobError } from '../utils/download.js'

// data: { status: 'OK' | 'ERROR', checkedAt } (desde la caché del back)
export const getIntegrityStatus = () => axiosClient.get('/integrity/status').then((res) => res.data)

// Informe completo. data: { status, checkedAt, alteredRows, tablesWithErrors, tables: [{ table, label, checked, errors, dvvOk }] }
export const verifyIntegrity = () => axiosClient.post('/integrity/verify', null, { timeout: 120000 }).then((res) => res.data)

// tables: ['fee', ...] o null para reparar todo. data: el informe nuevo
export const repairIntegrity = (tables) =>
  axiosClient.post('/integrity/repair', tables ? { tables } : { all: true }, { timeout: 120000 }).then((res) => res.data)

// Informe en CSV: { blob, fileName }
export async function downloadIntegrityReport() {
  try {
    const res = await axiosClient.get('/integrity/report.csv', { responseType: 'blob', timeout: 120000 })
    return { blob: res.data, fileName: fileNameOf(res, 'integridad.csv') }
  } catch (error) {
    throw await readBlobError(error)
  }
}
