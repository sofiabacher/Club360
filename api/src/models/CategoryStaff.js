const { DataTypes } = require('sequelize')
const sequelize = require('../config/db')

const CategoryStaff = sequelize.define('CategoryStaff', {
    staffId: { type: DataTypes.INTEGER, primaryKey: true },
    categoryId: { type: DataTypes.INTEGER, primaryKey: true },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    dvh: { type: DataTypes.INTEGER, allowNull: true }
}, {
    tableName: 'categoryStaff'
})

module.exports = CategoryStaff
