const express = require('express')
const path = require('path')

const cors = require('./middlewares/cors')
const errorHandler = require('./middlewares/errorHandler')
const { isPrivateUploadPath } = require('./utils/files')
const { general } = require('./utils/messages')

const app = express()

app.use(cors)
app.use(express.json())
// Las carpetas privadas de uploads/ (los comprobantes de transferencias) no se sirven: se descargan desde su módulo
app.use('/uploads', (req, res, next) => (isPrivateUploadPath(req.path) ? res.status(404).json({ success: false, message: general.notFound }) : next()))
app.use('/uploads', express.static(path.join(__dirname, '../uploads')))

// Lo llama cada 10 minutos un servicio externo para que Render gratis no se duerma: no consulta la base
app.get('/health', (req, res) => {
    res.json({ success: true, message: 'API de Club360 funcionando' })
})

// Rutas de cada módulo
app.use('/auth', require('./modules/auth/auth.routes'))
app.use('/access', require('./modules/access/access.routes'))
app.use('/clubs', require('./modules/clubs/clubs.routes'))
app.use('/members', require('./modules/members/members.routes'))
app.use('/family-link', require('./modules/members/familyLink.routes'))
app.use('/staff', require('./modules/staff/staff.routes'))
app.use('/inscriptions', require('./modules/inscriptions/inscriptions.routes'))
app.use('/fees', require('./modules/fees/fees.routes'))
app.use('/leagues', require('./modules/leagues/leagues.routes'))
app.use('/games', require('./modules/games/games.routes'))
app.use('/citations', require('./modules/citations/citations.routes'))
app.use('/routines', require('./modules/routines/routines.routes'))
app.use('/notifications', require('./modules/notifications/notifications.routes'))
app.use('/logs', require('./modules/logs/logs.routes'))
app.use('/integrity', require('./modules/integrity/integrity.routes'))
app.use('/backup', require('./modules/backup/backup.routes'))

app.use(errorHandler)

module.exports = app
