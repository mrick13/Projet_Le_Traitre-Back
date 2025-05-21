const express = require('express');
const router = express.Router();
const { Partie ,User } = require('../models');

// Route pour créer un nouveau lobby
router.post('/lobby', async (req, res) => {
    const { id } = req.body;

    try {
        const newLobby = await Partie.create({
            id,
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

router.post('/demo', async (req, res) => {
    try {
        const demoId = 'DEMO1234';

        // Vérifie si la partie existe déjà
        const existing = await Partie.findByPk(demoId);
        if (existing) return res.status(400).json({ error: 'Partie démo déjà créée.' });

        const partie = await Partie.create({
            id: demoId,
            roles: JSON.stringify([
                { joueurId: 1, role: 'Villageois' },
                { joueurId: 2, role: 'Voyante' },
                { joueurId: 3, role: 'Loup-Garou' },
                { joueurId: 4, role: 'Villageois' },
                { joueurId: 5, role: 'Sorcière' },
                { joueurId: 6, role: 'Villageois' },
                { joueurId: 7, role: 'Loup-Garou' },
                { joueurId: 8, role: 'Villageois' }
            ])
        });

        // Crée les utilisateurs fictifs
        const joueurs = [];
        for (let i = 1; i <= 8; i++) {
            const pseudo = `Joueur ${i}`;
            const user = await User.create({ email: `demo${i}@demo.com`, password: 'demo', pseudo });
            joueurs.push(user);
            await partie.addUser(user); // lie le joueur à la partie
        }

            res.status(201).json({ message: 'Partie démo créée.', gameId: demoId, partie });
        } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});


module.exports = router;