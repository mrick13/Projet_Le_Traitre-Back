'use strict';

const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
const process = require('process');
const basename = path.basename(__filename);
const env = process.env.NODE_ENV || 'development';
const configFile = require(__dirname + '/../config/config.js');
const db = {};

let config = configFile[env];
let sequelize;

// Ajout de la gestion Platform.sh
if (process.env.PLATFORM_RELATIONSHIPS) {
    const relationships = JSON.parse(
        Buffer.from(process.env.PLATFORM_RELATIONSHIPS, 'base64').toString('utf-8')
    );
    const dbRel = relationships.db[0];
    config = {
        username: dbRel.username,
        password: dbRel.password,
        database: dbRel.path,
        host: dbRel.host,
        port: dbRel.port,
        dialect: 'postgres',
        ssl: dbRel.scheme === 'postgresql',
        dialectOptions: {
            ssl: dbRel.scheme === 'postgresql' ? { rejectUnauthorized: false } : false,
        },
        logging: false,
    };
    sequelize = new Sequelize(config.database, config.username, config.password, config);
} else if (config.use_env_variable) {
    sequelize = new Sequelize(process.env[config.use_env_variable], config);
} else {
    sequelize = new Sequelize(config.database, config.username, config.password, config);
}

fs
    .readdirSync(__dirname)
    .filter(file => {
        return (
            file.indexOf('.') !== 0 &&
            file !== basename &&
            file.slice(-3) === '.js' &&
            file.indexOf('.test.js') === -1
        );
    })
    .forEach(file => {
        const model = require(path.join(__dirname, file))(sequelize, Sequelize.DataTypes);
        db[model.name] = model;
    });

Object.keys(db).forEach(modelName => {
    if (db[modelName].associate) {
        db[modelName].associate(db);
    }
});

// Model associations
db.User.belongsToMany(db.Partie, { through: 'JoueurPartie' });
db.Partie.belongsToMany(db.User, { through: 'JoueurPartie' });
db.User.hasMany(db.CarteDeJeu, { foreignKey: 'joueurId' });
db.CarteDeJeu.belongsTo(db.User, { foreignKey: 'joueurId' });
db.Partie.hasMany(db.CarteDeJeu, { foreignKey: 'partieId' });
db.CarteDeJeu.belongsTo(db.Partie, { foreignKey: 'partieId' });

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;