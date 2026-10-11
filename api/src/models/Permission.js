// Catálogo global de la plataforma (sin clubId)
const { DataTypes } = require('sequelize')
const sequelize = require('../config/db')

const Permission = sequelize.define('Permission', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING(100), allowNull: false },   // Formato módulo.acción
    module: { type: DataTypes.STRING(50), allowNull: false },
    action: { type: DataTypes.STRING(50), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    dvh: { type: DataTypes.INTEGER, allowNull: true }
}, {
    tableName: 'permission',
    indexes: [{ name: 'permission_name_unique', unique: true, fields: ['name'] }]
})

module.exports = Permission
