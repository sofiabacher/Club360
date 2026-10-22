// Módulo access: roles, permisos y su asignación.
// Cada ruta encadena: isAuth → checkPermission('módulo.acción') → reglas del validator → validateFields → controller
const express = require('express')

const isAuth = require('../../middlewares/isAuth')
const checkPermission = require('../../middlewares/checkPermission')
const validateFields = require('../../middlewares/validateFields')
const controller = require('./access.controller')
const validator = require('./access.validator')
const { PERMISSIONS } = require('../../utils/permissions')

const router = express.Router()

const manageRoles = [isAuth, checkPermission(PERMISSIONS.ACCESS_MANAGE_ROLES)]
const assignRoles = [isAuth, checkPermission(PERMISSIONS.ACCESS_ASSIGN_ROLES)]

// Catálogo de permisos: lo usan las dos pantallas (roles y usuarios), así que alcanza con uno de los dos permisos
router.get('/permissions', isAuth, checkPermission([PERMISSIONS.ACCESS_MANAGE_ROLES, PERMISSIONS.ACCESS_ASSIGN_ROLES]), controller.listPermissions)

// Roles
router.get('/roles', ...manageRoles, controller.listRoles)
router.get('/roles/:id', ...manageRoles, validator.roleById, validateFields, controller.getRole)
router.post('/roles', ...manageRoles, validator.createRole, validateFields, controller.createRole)
router.put('/roles/:id', ...manageRoles, validator.updateRole, validateFields, controller.updateRole)
router.delete('/roles/:id', ...manageRoles, validator.roleById, validateFields, controller.deleteRole)

// Usuarios: roles asignables y permisos directos
router.get('/users', ...assignRoles, validator.listUsers, validateFields, controller.listUsers)
router.get('/users/:id', ...assignRoles, validator.userById, validateFields, controller.getUser)
router.put('/users/:id/roles', ...assignRoles, validator.updateUserRoles, validateFields, controller.updateUserRoles)
router.put('/users/:id/permissions', ...assignRoles, validator.updateUserPermissions, validateFields, controller.updateUserPermissions)

module.exports = router
