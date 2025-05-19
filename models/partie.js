module.exports = (sequelize, DataTypes) => {
    const Partie = sequelize.define('Partie', {
        id: {
            type: DataTypes.STRING(8),
            primaryKey: true,
            allowNull: false,
        },
        roles: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        historique: DataTypes.JSON,
        etat: DataTypes.STRING ,
    });

    Partie.associate = (models) => {
        Partie.hasMany(models.CarteDeJeu, { foreignKey: 'partieId' });
        Partie.belongsToMany(models.User, { through: 'JoueurPartie' });
    };
    return Partie;
};