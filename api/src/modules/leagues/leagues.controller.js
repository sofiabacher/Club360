// Controller de leagues.
// Lee req (params, query, body, user), llama al service y responde { success: true, data } o { success: false, message }.
// Sin lógica de negocio ni acceso a modelos. Los errores se pasan con next(error).
const service = require('./leagues.service')

// ---------- Ligas ----------

const list = async (req, res, next) => {
    try {
        const data = await service.listLeagues(req.user, { includeInactive: req.query.includeInactive === 'true' })
        res.json({ success: true, data })

    } catch (error) {
        next(error)
    }
}

const createLeague = async (req, res, next) => {
    try {
        const { name, clubSportId, ageScale } = req.body
        const data = await service.createLeague(req.user, { name, clubSportId, ageScale })
        res.status(201).json({ success: true, data })

    } catch (error) {
        next(error)
    }
}

const updateLeague = async (req, res, next) => {
    try {
        const { name, ageScale } = req.body
        const data = await service.updateLeague(req.user, req.params.id, { name, ageScale })
        res.json({ success: true, data })

    } catch (error) {
        next(error)
    }
}

const deactivateLeague = async (req, res, next) => {
    try {
        const data = await service.deactivateLeague(req.user, req.params.id)
        res.json({ success: true, data })

    } catch (error) {
        next(error)
    }
}

const reactivateLeague = async (req, res, next) => {
    try {
        const data = await service.reactivateLeague(req.user, req.params.id)
        res.json({ success: true, data })

    } catch (error) {
        next(error)
    }
}

// ---------- Categorías ----------

const createCategory = async (req, res, next) => {
    try {
        const { ageGroup, name } = req.body
        const data = await service.createCategory(req.user, req.params.id, { ageGroup, name })
        res.status(201).json({ success: true, data })

    } catch (error) {
        next(error)
    }
}

const updateCategory = async (req, res, next) => {
    try {
        const data = await service.updateCategory(req.user, req.params.id, { name: req.body.name })
        res.json({ success: true, data })

    } catch (error) {
        next(error)
    }
}

const deactivateCategory = async (req, res, next) => {
    try {
        const data = await service.deactivateCategory(req.user, req.params.id)
        res.json({ success: true, data })

    } catch (error) {
        next(error)
    }
}

const reactivateCategory = async (req, res, next) => {
    try {
        const data = await service.reactivateCategory(req.user, req.params.id)
        res.json({ success: true, data })

    } catch (error) {
        next(error)
    }
}

const getCategory = async (req, res, next) => {
    try {
        const data = await service.getCategory(req.user, req.params.id)
        res.json({ success: true, data })

    } catch (error) {
        next(error)
    }
}

// ---------- Asignaciones ----------

const eligiblePlayers = async (req, res, next) => {
    try {
        const data = await service.getEligiblePlayers(req.user, req.params.id, { search: req.query.search })
        res.json({ success: true, data })

    } catch (error) {
        next(error)
    }
}

const assignPlayers = async (req, res, next) => {
    try {
        const data = await service.assignPlayers(req.user, req.params.id, { memberIds: req.body.memberIds })
        res.json({ success: true, data })

    } catch (error) {
        next(error)
    }
}

const unassignPlayer = async (req, res, next) => {
    try {
        const data = await service.unassignPlayer(req.user, req.params.id, req.params.memberId)
        res.json({ success: true, data })

    } catch (error) {
        next(error)
    }
}

const eligibleStaff = async (req, res, next) => {
    try {
        const data = await service.getEligibleStaff(req.user, req.params.id)
        res.json({ success: true, data })

    } catch (error) {
        next(error)
    }
}

const assignStaff = async (req, res, next) => {
    try {
        const data = await service.assignStaff(req.user, req.params.id, { staffIds: req.body.staffIds })
        res.json({ success: true, data })

    } catch (error) {
        next(error)
    }
}

const unassignStaff = async (req, res, next) => {
    try {
        const data = await service.unassignStaff(req.user, req.params.id, req.params.staffId)
        res.json({ success: true, data })

    } catch (error) {
        next(error)
    }
}

// ---------- Mis categorías ----------

const myCategories = async (req, res, next) => {
    try {
        const data = await service.getMyCategories(req.user)
        res.json({ success: true, data })

    } catch (error) {
        next(error)
    }
}

module.exports = {
    list,
    createLeague,
    updateLeague,
    deactivateLeague,
    reactivateLeague,
    createCategory,
    updateCategory,
    deactivateCategory,
    reactivateCategory,
    getCategory,
    eligiblePlayers,
    assignPlayers,
    unassignPlayer,
    eligibleStaff,
    assignStaff,
    unassignStaff,
    myCategories
}
