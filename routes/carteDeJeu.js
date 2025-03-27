const express = require('express');
const router = express.Router();
const { CarteDeJeu } = require('../models');

// Route pour ajouter une carte
router.post('/add', async (req, res) => {
    const { nom, role, pouvoir } = req.body;
    try {
        const newCard = await CarteDeJeu.create({ nom, role, pouvoir });
        res.json(newCard);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Route pour obtenir toutes les cartes
router.get('/all', async (req, res) => {
    try {
        const cards = await CarteDeJeu.findAll();
        res.json(cards);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;