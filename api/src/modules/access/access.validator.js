// Validator de access.
// Reglas de express-validator: solo el formato de los datos, no reglas de negocio.
// Que los permisos y los roles existan (y que los roles sean del club) lo verifica el service.
const { body, param, query } = require('express-validator')
const { access: m } = require('../../utils/messages')

const idParam = param('id').isInt({ min: 1 }).withMessage(m.idInvalid).bail().toInt()

// Array de enteros positivos (puede estar vacío)
const idList = (field, message) => [
    body(field).isArray().withMessage(message),
    body(`${field}.*`).isInt({ min: 1 }).withMessage(message).bail().toInt()
]

// Letras (con tildes y ñ), números, espacios y guiones
const roleName = () => body('name')
    .isString().withMessage(m.roleNameLength).bail()
    .trim()
    .isLength({ min: 3, max: 50 }).withMessage(m.roleNameLength).bail()
    .matches(/^[\p{L}\p{N} -]+$/u).withMessage(m.roleNameFormat)

const description = body('description')
    .optional({ values: 'null' })
    .isString().withMessage(m.descriptionLength).bail()
    .trim()
    .isLength({ max: 200 }).withMessage(m.descriptionLength)

const roleById = [idParam]

const createRole = [roleName(), description, ...idList('permissionIds', m.permissionIdsInvalid)]

// En un rol base el service ignora el nombre, así que acá es opcional
const updateRole = [idParam, roleName().optional(), description, ...idList('permissionIds', m.permissionIdsInvalid)]

const listUsers = [
    query('search').optional().isString().withMessage(m.searchLength).bail().trim().isLength({ max: 100 }).withMessage(m.searchLength),
    query('page').optional().isInt({ min: 1 }).withMessage(m.pageInvalid).bail().toInt()
]

const userById = [idParam]

const updateUserRoles = [idParam, ...idList('roleIds', m.roleIdsInvalid)]

const updateUserPermissions = [idParam, ...idList('permissionIds', m.permissionIdsInvalid)]

module.exports = {
    roleById,
    createRole,
    updateRole,
    listUsers,
    userById,
    updateUserRoles,
    updateUserPermissions
}
