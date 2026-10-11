// Bitácora. No tiene dvh ni updatedAt: un registro de bitácora no se edita
const { DataTypes } = require('sequelize')
const sequelize = require('../config/db')

const Log = sequelize.define('Log', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    clubId: { type: DataTypes.INTEGER, allowNull: false },
    userId: { type: DataTypes.INTEGER, allowNull: true },
    roleId: { type: DataTypes.INTEGER, allowNull: true },   // Rol activo con el que se hizo la acción
    action: { type: DataTypes.STRING(50), allowNull: false },
    details: { type: DataTypes.TEXT, allowNull: true },
    criticity: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 1 }   // CRITICITY en utils/constants.js
}, {
    tableName: 'log',
    updatedAt: false
})

module.exports = Log
