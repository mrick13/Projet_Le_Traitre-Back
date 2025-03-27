const express = require('express');
const router = express.Router();
const { Connexion } = require('../models');

// Route pour inscription
router.post('/register', async (req, res) => {
    const { password, email, pseudo } = req.body;
    try {
        const newUser = await Connexion.create({ password, email, pseudo });
        res.json(newUser);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Route pour connexion
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await Connexion.findOne({ where: { email, password } });
        if (user) {
            res.json(user);
        } else {
            res.status(401).json({ error: 'Invalid credentials' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;