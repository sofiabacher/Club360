const { DataTypes } = require('sequelize')
const sequelize = require('../config/db')

const Fee = sequelize.define('Fee', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    clubId: { type: DataTypes.INTEGER, allowNull: false },
    memberId: { type: DataTypes.INTEGER, allowNull: false },
    period: { type: DataTypes.CHAR(7), allowNull: false },   // Formato AAAA-MM
    expirationDate: { type: DataTypes.DATEONLY, allowNull: false },
    socialAmount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    sportAmount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    feeState: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },   // Estado: FEE_STATES en utils/constants.js
    dvh: { type: DataTypes.INTEGER, allowNull: true }
}, {
    tableName: 'fee',
    indexes: [{ name: 'fee_memberId_period_unique', unique: true, fields: ['memberId', 'period'] }]   // Una cuota por socio y por mes
})

module.exports = Fee
