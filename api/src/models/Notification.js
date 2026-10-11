const { DataTypes } = require('sequelize')
const sequelize = require('../config/db')

const Notification = sequelize.define('Notification', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    clubId: { type: DataTypes.INTEGER, allowNull: false },
    recipientId: { type: DataTypes.INTEGER, allowNull: false },   // Usuario que la recibe
    transmitterId: { type: DataTypes.INTEGER, allowNull: true },   // Usuario que la envía. NULL cuando la genera el sistema
    type: { type: DataTypes.STRING(50), allowNull: false },
    title: { type: DataTypes.STRING(150), allowNull: false },
    message: { type: DataTypes.TEXT, allowNull: false },
    isRead: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    dvh: { type: DataTypes.INTEGER, allowNull: true }
}, {
    tableName: 'notification'
})

module.exports = Notification
