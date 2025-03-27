module.exports = (sequelize, DataTypes) => {
    const CarteDeJeu = sequelize.define('CarteDeJeu', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        nom: DataTypes.STRING,
        role: DataTypes.STRING,
        pouvoir: DataTypes.STRING
    });
    return CarteDeJeu;
};