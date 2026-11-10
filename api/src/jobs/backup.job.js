// Backup automático (los domingos a las 03:00): un backup de cada club, con tipo AUTO. Corre también en los clubes
// bloqueados por integridad. Si falla en uno, lo registra (BACKUP_AUTO_FAILED) y sigue con el siguiente
const { runAutoBackups } = require('../modules/backup/backup.service')

module.exports = {
    name: 'backup',
    schedule: '0 3 * * 0',
    run: () => runAutoBackups()
}
