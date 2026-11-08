const { DataTypes } = require('sequelize')
const sequelize = require('../config/db')

const Routine = sequelize.define('Routine', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    clubId: { type: DataTypes.INTEGER, allowNull: false },
    categoryId: { type: DataTypes.INTEGER, allowNull: false },
    userId: { type: DataTypes.INTEGER, allowNull: false },   // La preparadora física que la cargó
    weekStart: { type: DataTypes.DATEONLY, allowNull: false },   // Siempre el lunes de la semana (getWeekStart)
    dayOfWeek: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 1 },   // 1 lunes … 5 viernes (ROUTINE_DAYS; sábado y domingo no tienen rutina). Fecha: weekStart + (dayOfWeek − 1)
    title: { type: DataTypes.STRING(150), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: false },
    imageUrl: { type: DataTypes.STRING(255), allowNull: true },
    videoUrl: { type: DataTypes.STRING(255), allowNull: true },
    dvh: { type: DataTypes.INTEGER, allowNull: true }
}, {
    tableName: 'routine',
    // Una sola rutina por categoría y por día
    indexes: [{ name: 'routine_category_week_day_unique', unique: true, fields: ['categoryId', 'weekStart', 'dayOfWeek'] }]
})

module.exports = Routine
