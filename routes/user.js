const express = require('express');
const router = express.Router();
const { User, Partie } = require('../models');

// Route pour inscription
router.post('/register', async (req, res) => {
    const { password, email, pseudo } = req.body;
    try {
        const newUser = await User.create({ password, email, pseudo});
        const userJson = newUser.toJSON();
        delete userJson.password;
        res.json(userJson);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Route pour connexion
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ where: { email } });
        if (user && await user.comparePassword(password)) {
            const userJson = user.toJSON();
            delete userJson.password;
            res.json(userJson);
        } else {
            res.status(401).json({ error: 'Invalid credentials' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/profile', async (req, res) => {
    try {
        // Supposons que l'utilisateur est authentifié et que son ID est dans req.user.id
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ error: 'Utilisateur non authentifié' });
        }

        // Rechercher l'utilisateur dans la base de données
        const user = await User.findByPk(userId);

        if (!user) {
            return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }

        // Envoyer le pseudo au frontend
        res.status(200).json({ pseudo: user.pseudo });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erreur interne du serveur' });
    }
});

// Changer son pseudo (en vérifiant qu'il n'est pas déjà pris par un autre utilisateur)
router.patch('/:id/pseudo', async (req, res) => {
    const { pseudo } = req.body;

    if (!pseudo || !pseudo.trim()) {
        return res.status(400).json({ error: 'Pseudo requis' });
    }

    try {
        const user = await User.findByPk(req.params.id);
        if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });

        const existing = await User.findOne({ where: { pseudo: pseudo.trim() } });
        if (existing && existing.id !== user.id) {
            return res.status(409).json({ error: 'Ce pseudo est déjà pris.' });
        }

        user.pseudo = pseudo.trim();
        await user.save();
        res.json({ id: user.id, pseudo: user.pseudo });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Historique des parties jouées par un utilisateur (rôle joué, victoire/défaite)
router.get('/:id/historique', async (req, res) => {
    try {
        const user = await User.findByPk(req.params.id);
        if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });

        // Tri fait en JS (et non via ORDER BY en SQL) pour éviter toute ambiguïté entre la
        // colonne "updatedAt" de Partie et celle de User une fois la jointure faite.
        const parties = await Partie.findAll({
            include: [{ model: User, where: { id: user.id }, attributes: [] }]
        });

        const historique = parties
            .filter(p => p.historique)
            .map(p => {
                const hist = p.historique;
                const moi = hist.players?.find(pl => pl.userId === user.id);
                const won = hist.winner && moi
                    ? (hist.winner === 'loups' ? moi.playerRole === 'Loup-Garou' : moi.playerRole !== 'Loup-Garou')
                    : null;

                return {
                    gameId: p.id,
                    date: p.updatedAt,
                    // Un utilisateur lié à la partie sans entrée dans hist.players en était le MJ
                    // (le MJ n'est jamais un joueur de la partie, voir sockets/index.js).
                    role: moi ? moi.playerRole : 'Maître du jeu',
                    winner: hist.winner,
                    won
                };
            })
            .sort((a, b) => new Date(b.date) - new Date(a.date));

        res.json({ historique });
    } catch (err) {
        console.error('Erreur historique :', err);
        res.status(500).json({ error: err.message });
    }
});

router.get('/users', async (req, res) => {
    try {
        const users = await User.findAll({ attributes: { exclude: ['password'] } });
        if (users.length === 0) {
            return res.status(404).json({ message: 'Aucun utilisateur trouvé' });
        }
        res.status(200).json(users);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

router.post('/users', async (req, res) => {
    try {
        const user = await User.create({
            email: 'example@mail.com',
            password: 'password123',
            pseudo: 'exampleuser',
        });
        const userJson = user.toJSON();
        delete userJson.password;
        res.status(201).json(userJson);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

module.exports = router;
