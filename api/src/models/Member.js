const { DataTypes } = require('sequelize')
const sequelize = require('../config/db')

const Member = sequelize.define('Member', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    clubId: { type: DataTypes.INTEGER, allowNull: false },
    userId: { type: DataTypes.INTEGER, allowNull: false },
    numMember: { type: DataTypes.STRING(20), allowNull: false },   // Lo genera la aplicación
    memberStateId: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },   // Estado: MEMBER_STATES en utils/constants.js
    codeFamily: { type: DataTypes.STRING(20), allowNull: true },   // Código de vínculo familiar (socios menores de edad)
    adultUserId: { type: DataTypes.INTEGER, allowNull: true },   // Usuario del adulto responsable. Apunta a user porque el adulto puede no ser Socio
    linkStatus: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    dvh: { type: DataTypes.INTEGER, allowNull: true }
}, {
    tableName: 'member',
    indexes: [
        { name: 'member_userId_unique', unique: true, fields: ['userId'] },
        { name: 'member_numMember_unique', unique: true, fields: ['numMember'] },
        { name: 'member_codeFamily_unique', unique: true, fields: ['codeFamily'] }
    ]
})

module.exports = Member
