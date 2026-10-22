// Llamadas a la API del módulo access: roles, permisos y su asignación a usuarios.
// Devuelven el cuerpo de la respuesta: { success, data }.
import axiosClient from './axiosClient.js'

// ---------- Permisos ----------

// data: [{ module, permissions: [{ id, name, action, description }] }]
export const getPermissions = () => axiosClient.get('/access/permissions').then((res) => res.data)

// ---------- Roles ----------

// data: [{ id, name, description, isBase, permissionCount, userCount, editableName }]
export const getRoles = () => axiosClient.get('/access/roles').then((res) => res.data)

// data: { id, name, description, isBase, editableName, userCount, permissionIds, lockedPermissions }
export const getRole = (id) => axiosClient.get(`/access/roles/${id}`).then((res) => res.data)

// payload: { name, description, permissionIds }
export const createRole = (payload) => axiosClient.post('/access/roles', payload).then((res) => res.data)

// payload: { name, description, permissionIds }. En un rol base el back ignora el nombre
export const updateRole = (id, payload) => axiosClient.put(`/access/roles/${id}`, payload).then((res) => res.data)

export const deleteRole = (id) => axiosClient.delete(`/access/roles/${id}`).then((res) => res.data)

// ---------- Usuarios ----------

// data: { items: [{ id, fullName, username, email, userStateId, roles }], total, page, pageSize, totalPages }
export const getUsers = ({ search, page }) =>
  axiosClient.get('/access/users', { params: { search: search || undefined, page } }).then((res) => res.data)

// data: { id, fullName, username, email, userStateId, isAdult, roles, assignableRoleIds, assignableRoles,
//         permissionIds, restrictedPermissionIds }
export const getUser = (id) => axiosClient.get(`/access/users/${id}`).then((res) => res.data)

// Solo roles asignables (nuevos y Admin del Club). data: el usuario actualizado
export const updateUserRoles = (id, roleIds) => axiosClient.put(`/access/users/${id}/roles`, { roleIds }).then((res) => res.data)

// data: el usuario actualizado
export const updateUserPermissions = (id, permissionIds) =>
  axiosClient.put(`/access/users/${id}/permissions`, { permissionIds }).then((res) => res.data)
