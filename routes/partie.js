const express = require('express');
const router = express.Router();
const { Partie ,User } = require('../models');

// Route pour créer un nouveau lobby (ou rejoindre le lobby existant, ex. rafraîchissement du MJ)
router.post('/lobby', async (req, res) => {
    const { id, userId } = req.body;

    try {
        const [lobby] = await Partie.findOrCreate({ where: { id } });

        // Lier le MJ à la partie pour qu'elle apparaisse dans son historique
        if (userId) {
            const host = await User.findByPk(userId);
            if (host) await lobby.addUser(host);
        }

        res.status(201).json({ gameId: lobby.id });
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
                { joueurId: 2, role: 'Villageois' },
                { joueurId: 3, role: 'Voyante' },
                { joueurId: 4, role: 'Loup-Garou' },
                { joueurId: 5, role: 'Villageois' },
                { joueurId: 6, role: 'Sorcière' },
                { joueurId: 7, role: 'Villageois' },
                { joueurId: 8, role: 'Loup-Garou' },
                { joueurId: 9, role: 'Villageois' }
            ])
        });

        // Crée les utilisateurs fictifs
        const joueurs = [];
        for (let i = 1; i <= 8; i++) {
            const pseudo = `Joueur ${i}`;
            const user = await User.create({ email: `demo${i}@demo.com`, password: 'demo', pseudo });
            joueurs.push(user);
            await partie.addUser(user);
        }

            res.status(201).json({ message: 'Partie démo créée.', gameId: demoId, partie });
        } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

router.patch('/:id/joueur/:joueurId', async (req, res) => {
    const { joueurId } = req.params;
    const { etat } = req.body;
    console.log('PATCH joueur:', joueurId, 'etat:', etat);

    try {
        const user = await User.findByPk(joueurId);
        if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });

        if (typeof etat === 'boolean') {
            user.etat = etat;
            await user.save();
            res.status(200).json({ message: "Etat du joueur mis à jour", joueur: user });
        } else {
            res.status(400).json({ error: "Champ 'etat' requis et doit être un booléen." });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


module.exports = router;