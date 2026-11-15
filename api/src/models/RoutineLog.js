const { DataTypes } = require('sequelize')
const sequelize = require('../config/db')

// Registro de cumplimiento de una jugadora para la rutina de un día (seguimiento personal, P20)
const RoutineLog = sequelize.define('RoutineLog', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    clubId: { type: DataTypes.INTEGER, allowNull: false },
    routineId: { type: DataTypes.INTEGER, allowNull: false },
    memberId: { type: DataTypes.INTEGER, allowNull: false },
    status: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 1 },   // ROUTINE_LOG_STATUS en utils/constants.js
    effort: { type: DataTypes.TINYINT, allowNull: true },   // Esfuerzo percibido de 1 a 5. NULL si no la completó
    note: { type: DataTypes.STRING(300), allowNull: true },
    dvh: { type: DataTypes.INTEGER, allowNull: true }
}, {
    tableName: 'routineLog',
    // Un solo registro por jugadora y por rutina
    indexes: [{ name: 'routine_log_routine_member_unique', unique: true, fields: ['routineId', 'memberId'] }]
})

module.exports = RoutineLog
