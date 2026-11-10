// Verificación nocturna de la integridad (todos los días a las 02:30): verifica cada club sin la caché, actualiza su
// estado y, si alguno pasó de OK a ERROR, lo registra y avisa (INTEGRITY_ALERT) a quienes tienen integrity.manage
const { runNightlyCheck } = require('../modules/integrity/integrity.service')

module.exports = {
    name: 'integrityCheck',
    schedule: '30 2 * * *',
    run: () => runNightlyCheck()
}
