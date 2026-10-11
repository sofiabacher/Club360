const express = require('express')
const path = require('path')

const cors = require('./middlewares/cors')
const errorHandler = require('./middlewares/errorHandler')

const app = express()

app.use(cors)
app.use(express.json())
app.use('/uploads', express.static(path.join(__dirname, '../uploads')))

app.get('/health', (req, res) => {
    res.json({ success: true, message: 'API de Club360 funcionando' })
})

// Rutas de cada módulo
app.use('/auth', require('./modules/auth/auth.routes'))
app.use('/access', require('./modules/access/access.routes'))
app.use('/clubs', require('./modules/clubs/clubs.routes'))
app.use('/members', require('./modules/members/members.routes'))
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
