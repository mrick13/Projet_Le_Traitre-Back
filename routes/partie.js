const express = require('express');
const router = express.Router();
const { Partie ,User } = require('../models');

// Route pour créer un nouveau lobby
router.post('/lobby', async (req, res) => {
    const { id } = req.body;

    try {
        const newLobby = await Partie.create({
            id,                  // ex: 'AB1CD2EF' → généré par le front
        });
        res.status(201).json({ gameId: newLobby.id });
    } catch (err) {
        console.error('Erreur création lobby :', err);
        res.status(500).json({ error: err.message });
    }
});

router.post('/:id/join', async (req, res) => {
    const { id } = req.params;
    const { userId } = req.body;

    try {
        const partie = await Partie.findByPk(id);
        if (!partie) return res.status(404).json({ error: 'Partie non trouvée' });

        const user = await User.findByPk(userId);
        if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });

        await partie.addUser(user);

        res.status(200).json({ message: `Joueur ${user.pseudo} a rejoint la partie ${id}` });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});


router.get('/:id/players', async (req, res) => {
    try {
        const partie = await Partie.findByPk(req.params.id, {
            include: [{ model: User, attributes: ['id', 'pseudo'] }]
        });

        if (!partie) return res.status(404).json({ error: 'Partie non trouvée' });

        res.json({ joueurs: partie.Users });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;