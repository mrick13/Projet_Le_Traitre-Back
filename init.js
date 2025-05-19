const { sequelize, CarteDeJeu } = require('./models');

const initialCards = [
    { nom: 'Villageois', role: 'Villageois', pouvoir: 'Rien' },
    { nom: 'Chasseur', role: 'Villageois', pouvoir: 'Peut tuer un joueur en mourant' },
    { nom: 'Voyante', role: 'Villageois', pouvoir: 'Peut voir la carte d’un joueur' },
    { nom: 'Loup-Garou', role: 'Loup-Garou', pouvoir: 'Peut tuer un joueur chaque nuit' },
    { nom: 'Sorcière', role: 'Villageois', pouvoir: 'Peut sauver ou tuer un joueur une fois par partie' },
];

sequelize.sync({ force: true }).then(async () => {
    try {
        await CarteDeJeu.bulkCreate(initialCards);
        console.log('Cartes de jeu initialisées avec succès');
    } catch (err) {
        console.error('Erreur lors de l’initialisation des cartes de jeu:', err);
    } finally {
        sequelize.close();
    }
});