const express = require('express');
const router = express.Router();
const { User } = require('../models'); // Remplacez Connexion par User

// Route pour inscription
router.post('/register', async (req, res) => {
    const { password, email, pseudo } = req.body;
    try {
        const newUser = await User.create({ password, email, pseudo });
        res.json(newUser);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Route pour connexion
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ where: { email, password } });
        if (user) {
            res.json(user);
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

module.exports = router;