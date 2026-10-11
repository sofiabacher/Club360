const { DataTypes } = require('sequelize')
const sequelize = require('../config/db')

const Routine = sequelize.define('Routine', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    clubId: { type: DataTypes.INTEGER, allowNull: false },
    categoryId: { type: DataTypes.INTEGER, allowNull: false },
    userId: { type: DataTypes.INTEGER, allowNull: false },   // La preparadora física que la cargó
    weekStart: { type: DataTypes.DATEONLY, allowNull: false },
    title: { type: DataTypes.STRING(150), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: false },
    imageUrl: { type: DataTypes.STRING(255), allowNull: true },
    videoUrl: { type: DataTypes.STRING(255), allowNull: true },
    dvh: { type: DataTypes.INTEGER, allowNull: true }
}, {
    tableName: 'routine'
})

module.exports = Routine
