const { DataTypes } = require('sequelize')
const sequelize = require('../config/db')

const UserRole = sequelize.define('UserRole', {
    userId: { type: DataTypes.INTEGER, primaryKey: true },
    roleId: { type: DataTypes.INTEGER, primaryKey: true },
    dvh: { type: DataTypes.INTEGER, allowNull: true }
}, {
    tableName: 'user_role'
})

module.exports = UserRole
