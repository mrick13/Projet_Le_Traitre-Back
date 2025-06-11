module.exports = (sequelize, DataTypes) => {
    const User = sequelize.define('User', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        password: DataTypes.STRING,
        email: DataTypes.STRING,
        pseudo: DataTypes.STRING,
        etat: {
            type :DataTypes.BOOLEAN,
            defaultValue: true //true sera pour vivant et false pour mort
        }
    });


    User.associate = (models) => {
        User.belongsToMany(models.Partie, { through: 'JoueurPartie' });
        User.hasMany(models.CarteDeJeu, { foreignKey: 'joueurId' });
    };

    return User;
};