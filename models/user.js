const bcrypt = require('bcrypt');

module.exports = (sequelize, DataTypes) => {
    const User = sequelize.define('User', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        password: DataTypes.STRING,
        email: {
            type: DataTypes.STRING,
            unique: true
        },
        pseudo: DataTypes.STRING,
        etat: {
            type :DataTypes.BOOLEAN,
            defaultValue: true //true sera pour vivant et false pour mort
        }
    }, {
        hooks: {
            beforeCreate: async (user) => {
                if (user.password) {
                    user.password = await bcrypt.hash(user.password, 10);
                }
            }
        }
    });

    User.prototype.comparePassword = async function(candidatePassword) {
        return bcrypt.compare(candidatePassword, this.password);
    };

    User.associate = (models) => {
        User.belongsToMany(models.Partie, { through: 'JoueurPartie' });
        User.hasMany(models.CarteDeJeu, { foreignKey: 'joueurId' });
    };

    return User;
};
