const { DataTypes } = require('sequelize')
const sequelize = require('../config/db')

const Payment = sequelize.define('Payment', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    clubId: { type: DataTypes.INTEGER, allowNull: false },
    userId: { type: DataTypes.INTEGER, allowNull: false },   // Quién pagó: el socio o el adulto Familia
    feeId: { type: DataTypes.INTEGER, allowNull: false },
    amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    transactionState: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },   // Estado: TRANSACTION_STATES en utils/constants.js
    confirmationCode: { type: DataTypes.STRING(50), allowNull: false },
    dvh: { type: DataTypes.INTEGER, allowNull: true }
}, {
    tableName: 'payment',
    indexes: [{ name: 'payment_confirmationCode_unique', unique: true, fields: ['confirmationCode'] }]
})

module.exports = Payment
