// Llamadas a la API del módulo backup: copias de seguridad del club y restauración.
// Devuelven el cuerpo de la respuesta: { success, data }.
import axiosClient from './axiosClient.js'
import { fileNameOf, readBlobError } from '../utils/download.js'

export const CONFIRM_WORD = 'RESTAURAR'

// data: { items: [{ fileName, createdAt, type, size, totalRows, tables, createdBy }] }
export const getBackups = () => axiosClient.get('/backup').then((res) => res.data)

// data: { fileName, createdAt, type, totalRows, tables, createdBy, size }
export const createBackup = () => axiosClient.post('/backup', null, { timeout: 120000 }).then((res) => res.data)

// El archivo .json: { blob, fileName }
export async function downloadBackup(fileName) {
  try {
    const res = await axiosClient.get(`/backup/${encodeURIComponent(fileName)}/download`, { responseType: 'blob', timeout: 120000 })
    return { blob: res.data, fileName: fileNameOf(res, fileName) }
  } catch (error) {
    throw await readBlobError(error)
  }
}

// data: { restored, preRestore, rows, verification: { status, checkedAt, alteredRows } }
export const restoreBackup = (fileName, confirm) =>
  axiosClient.post(`/backup/${encodeURIComponent(fileName)}/restore`, { confirm }, { timeout: 300000 }).then((res) => res.data)

export function restoreBackupFile(file, confirm) {
  const formData = new FormData()
  formData.append('confirm', confirm)
  formData.append('file', file)
  return axiosClient.post('/backup/restore-file', formData, { timeout: 300000 }).then((res) => res.data)
}
