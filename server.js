import express from 'express';
import cors from 'cors';
import { sequelize } from './models/index.js';
import connexionRoutes from './routes/connexion.js';
import carteDeJeuRoutes from './routes/carteDeJeu.js';
import partieRoutes from './routes/partie.js';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/connexion', connexionRoutes);
app.use('/carteDeJeu', carteDeJeuRoutes);
app.use('/partie', partieRoutes);

const PORT = process.env.PORT || 3000;

// Synchroniser la base de données et démarrer le serveur
sequelize.sync({ force: true }).then(() => {
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
});