const express = require('express');
const router = express.Router();
const { Partie, Connexion, CarteDeJeu } = require('../models');

// Route pour démarrer une nouvelle partie
router.post('/start', async (req, res) => {
    const { joueurs } = req.body; // Array of player IDs
    try {
        const newGame = await Partie.create({ historique: [], etat: 'en cours' });

        // Associer les joueurs à la partie
        const players = await Connexion.findAll({ where: { id: joueurs } });
        await newGame.addConnexions(players);

        res.json(newGame);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Route pour obtenir l'état d'une partie
router.get('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const game = await Partie.findOne({
            where: { id },
            include: [Connexion, CarteDeJeu]
        });
        res.json(game);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Route pour mettre à jour l'état de la partie (ex: lorsqu'un joueur meurt)
router.post('/:id/update', async (req, res) => {
    const { id } = req.params;
    const { historique, etat } = req.body;
    try {
        const game = await Partie.findOne({ where: { id } });
        game.historique = historique;
        game.etat = etat;
        await game.save();
        res.json(game);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;