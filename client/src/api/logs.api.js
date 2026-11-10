// Llamadas a la API del módulo logs: bitácora del club y su exportación a CSV. Devuelven el cuerpo: { success, data }.
import axiosClient from './axiosClient.js'
import { fileNameOf, readBlobError } from '../utils/download.js'

// Solo los filtros con valor
const clean = (params) => Object.fromEntries(Object.entries(params).filter(([, value]) => value !== '' && value !== null && value !== undefined))

// params: { from, to, criticity, action, userId, search, page }.
// data: { items: [{ id, createdAt, user, role, action, details, criticity }], byCriticity, total, page, totalPages }
export const getLogs = (params) => axiosClient.get('/logs', { params: clean(params) }).then((res) => res.data)

// data: { actions: [texto], users: [{ id, name, lastName, username }], criticities: [{ value, label }] }
export const getLogFilters = () => axiosClient.get('/logs/filters').then((res) => res.data)

// CSV con todos los registros del filtro: { blob, fileName }
export async function exportLogs(params) {
  try {
    const res = await axiosClient.get('/logs/export', { params: clean(params), responseType: 'blob', timeout: 60000 })
    return { blob: res.data, fileName: fileNameOf(res, 'bitacora.csv') }
  } catch (error) {
    throw await readBlobError(error)
  }
}
