const { DataTypes } = require('sequelize')
const sequelize = require('../config/db')

const RolePermission = sequelize.define('RolePermission', {
    roleId: { type: DataTypes.INTEGER, primaryKey: true },
    permissionId: { type: DataTypes.INTEGER, primaryKey: true },
    dvh: { type: DataTypes.INTEGER, allowNull: true }
}, {
    tableName: 'role_permission'
})

module.exports = RolePermission
