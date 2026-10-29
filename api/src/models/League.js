const { DataTypes } = require('sequelize')
const sequelize = require('../config/db')

const League = sequelize.define('League', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    clubId: { type: DataTypes.INTEGER, allowNull: false },
    clubSportId: { type: DataTypes.INTEGER, allowNull: false },
    name: { type: DataTypes.STRING(100), allowNull: false },
    ageScale: { type: DataTypes.TINYINT, allowNull: false },   // Escala de edad: 1 o 2, una clave de AGE_SCALES en utils/constants.js
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    dvh: { type: DataTypes.INTEGER, allowNull: true }
}, {
    tableName: 'league'
})

module.exports = League
