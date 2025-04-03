module.exports = (sequelize, DataTypes) => {
    const CarteDeJeu = sequelize.define('CarteDeJeu', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        nom: DataTypes.STRING,
        role: DataTypes.STRING,
        pouvoir: DataTypes.STRING,
        joueurId: {
            type: DataTypes.INTEGER,
            references: {
                model: 'Connexions',
                key: 'id'
            }
        },
        partieId: {
            type: DataTypes.INTEGER,
            references: {
                model: 'Parties',
                key: 'id'
            }
        }
    });

    CarteDeJeu.associate = (models) => {
        CarteDeJeu.belongsTo(models.Connexion, { foreignKey: 'joueurId' });
        CarteDeJeu.belongsTo(models.Partie, { foreignKey: 'partieId' });
    };

    return CarteDeJeu;
};