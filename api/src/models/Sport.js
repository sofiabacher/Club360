// Catálogo global de deportes de la plataforma (sin clubId)
const { DataTypes } = require('sequelize')
const sequelize = require('../config/db')

const Sport = sequelize.define('Sport', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING(80), allowNull: false },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    dvh: { type: DataTypes.INTEGER, allowNull: true }
}, {
    tableName: 'sport',
    indexes: [{ name: 'sport_name_unique', unique: true, fields: ['name'] }]
})

module.exports = Sport
