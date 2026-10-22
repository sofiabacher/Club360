// Controller de access.
// Lee req (params, query, body, user), llama al service y responde { success: true, data } o { success: false, message }.
// Sin lógica de negocio ni acceso a modelos. Los errores se pasan con next(error).
const service = require('./access.service')

const listPermissions = async (req, res, next) => {
    try {
        const data = await service.listPermissions()
        res.json({ success: true, data })

    } catch (error) {
        next(error)
    }
}

const listRoles = async (req, res, next) => {
    try {
        const data = await service.listRoles(req.user)
        res.json({ success: true, data })

    } catch (error) {
        next(error)
    }
}

const getRole = async (req, res, next) => {
    try {
        const data = await service.getRole(req.user, req.params.id)
        res.json({ success: true, data })

    } catch (error) {
        next(error)
    }
}

const createRole = async (req, res, next) => {
    try {
        const { name, description, permissionIds } = req.body
        const data = await service.createRole(req.user, { name, description, permissionIds })
        res.json({ success: true, data })

    } catch (error) {
        next(error)
    }
}

const updateRole = async (req, res, next) => {
    try {
        const { name, description, permissionIds } = req.body
        const data = await service.updateRole(req.user, req.params.id, { name, description, permissionIds })
        res.json({ success: true, data })

    } catch (error) {
        next(error)
    }
}

const deleteRole = async (req, res, next) => {
    try {
        await service.deleteRole(req.user, req.params.id)
        const data = { id: req.params.id }
        res.json({ success: true, data })

    } catch (error) {
        next(error)
    }
}

const listUsers = async (req, res, next) => {
    try {
        const { search, page } = req.query
        const data = await service.listUsers(req.user, { search, page })
        res.json({ success: true, data })

    } catch (error) {
        next(error)
    }
}

const getUser = async (req, res, next) => {
    try {
        const data = await service.getUser(req.user, req.params.id)
        res.json({ success: true, data })

    } catch (error) {
        next(error)
    }
}

const updateUserRoles = async (req, res, next) => {
    try {
        const data = await service.updateUserRoles(req.user, req.params.id, { roleIds: req.body.roleIds })
        res.json({ success: true, data })

    } catch (error) {
        next(error)
    }
}

const updateUserPermissions = async (req, res, next) => {
    try {
        const data = await service.updateUserPermissions(req.user, req.params.id, { permissionIds: req.body.permissionIds })
        res.json({ success: true, data })

    } catch (error) {
        next(error)
    }
}

module.exports = {
    listPermissions,
    listRoles,
    getRole,
    createRole,
    updateRole,
    deleteRole,
    listUsers,
    getUser,
    updateUserRoles,
    updateUserPermissions
}
