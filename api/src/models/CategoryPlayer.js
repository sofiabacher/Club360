const { DataTypes } = require('sequelize')
const sequelize = require('../config/db')

const CategoryPlayer = sequelize.define('CategoryPlayer', {
    memberId: { type: DataTypes.INTEGER, primaryKey: true },
    categoryId: { type: DataTypes.INTEGER, primaryKey: true },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    dvh: { type: DataTypes.INTEGER, allowNull: true }
}, {
    tableName: 'categoryPlayer'
})

module.exports = CategoryPlayer
