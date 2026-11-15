const { DataTypes } = require('sequelize')
const sequelize = require('../config/db')

// Objetivo personal de una jugadora (seguimiento personal, P20). "Vencido" no es un estado: es un objetivo En curso con
// dueDate pasada, y se calcula al mostrarlo
const Goal = sequelize.define('Goal', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    clubId: { type: DataTypes.INTEGER, allowNull: false },
    memberId: { type: DataTypes.INTEGER, allowNull: false },
    text: { type: DataTypes.STRING(200), allowNull: false },
    dueDate: { type: DataTypes.DATEONLY, allowNull: false },   // Fecha límite
    goalState: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },   // GOAL_STATES en utils/constants.js
    closedAt: { type: DataTypes.DATE, allowNull: true },   // Cuándo se marcó como Cumplido o Abandonado
    dvh: { type: DataTypes.INTEGER, allowNull: true }
}, {
    tableName: 'goal'
})

module.exports = Goal
