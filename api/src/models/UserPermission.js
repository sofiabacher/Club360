// Permisos directos de un usuario, para excepciones puntuales sin crear un rol nuevo
const { DataTypes } = require('sequelize')
const sequelize = require('../config/db')

const UserPermission = sequelize.define('UserPermission', {
    userId: { type: DataTypes.INTEGER, primaryKey: true },
    permissionId: { type: DataTypes.INTEGER, primaryKey: true },
    dvh: { type: DataTypes.INTEGER, allowNull: true }
}, {
    tableName: 'user_permission'
})

module.exports = UserPermission
