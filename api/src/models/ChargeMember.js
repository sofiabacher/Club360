const { DataTypes } = require('sequelize')
const sequelize = require('../config/db')

// Lo que debe un socio por un cargo eventual: uno por socio y cargo. Se paga como la cuota (tarjeta, transferencia o
// secretaría), pero un cargo impago no es mora
const ChargeMember = sequelize.define('ChargeMember', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    clubId: { type: DataTypes.INTEGER, allowNull: false },
    chargeId: { type: DataTypes.INTEGER, allowNull: false },
    memberId: { type: DataTypes.INTEGER, allowNull: false },
    chargeState: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },   // Estado: CHARGE_STATES en utils/constants.js
    dvh: { type: DataTypes.INTEGER, allowNull: true }
}, {
    tableName: 'chargeMember',
    indexes: [{ name: 'chargeMember_chargeId_memberId_unique', unique: true, fields: ['chargeId', 'memberId'] }]   // Un cargo por socio
})

module.exports = ChargeMember
