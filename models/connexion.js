module.exports = (sequelize, DataTypes) => {
    const Connexion = sequelize.define('Connexion', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        password: DataTypes.STRING,
        email: DataTypes.STRING,
        pseudo: DataTypes.STRING
    });

    Connexion.associate = (models) => {
        Connexion.belongsToMany(models.Partie, { through: 'JoueurPartie' });
        Connexion.hasMany(models.CarteDeJeu, { foreignKey: 'joueurId' });
    };

    return Connexion;
};