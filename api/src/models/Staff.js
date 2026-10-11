const { DataTypes } = require('sequelize')
const sequelize = require('../config/db')

const Staff = sequelize.define('Staff', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    clubId: { type: DataTypes.INTEGER, allowNull: false },
    userId: { type: DataTypes.INTEGER, allowNull: false },
    clubSportId: { type: DataTypes.INTEGER, allowNull: false },
    dvh: { type: DataTypes.INTEGER, allowNull: true }
}, {
    tableName: 'staff',
    indexes: [{ name: 'staff_userId_unique', unique: true, fields: ['userId'] }]
})

module.exports = Staff
