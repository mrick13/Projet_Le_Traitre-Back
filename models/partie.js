module.exports = (sequelize, DataTypes) => {
    const Partie = sequelize.define('Partie', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        historique: DataTypes.JSON,
        etat: DataTypes.STRING
    });
    return Partie;
};