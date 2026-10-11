const { DataTypes } = require('sequelize')
const sequelize = require('../config/db')

const League = sequelize.define('League', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    clubId: { type: DataTypes.INTEGER, allowNull: false },
    clubSportId: { type: DataTypes.INTEGER, allowNull: false },
    name: { type: DataTypes.STRING(100), allowNull: false },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    dvh: { type: DataTypes.INTEGER, allowNull: true }
}, {
    tableName: 'league'
})

module.exports = League
