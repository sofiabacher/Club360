const { DataTypes } = require('sequelize')
const sequelize = require('../config/db')

const Role = sequelize.define('Role', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    clubId: { type: DataTypes.INTEGER, allowNull: false },
    name: { type: DataTypes.STRING(50), allowNull: false },
    isBase: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    dvh: { type: DataTypes.INTEGER, allowNull: true }
}, {
    tableName: 'role',
    indexes: [{ name: 'role_clubId_name_unique', unique: true, fields: ['clubId', 'name'] }]   // name es único por club, no en toda la base
})

module.exports = Role
