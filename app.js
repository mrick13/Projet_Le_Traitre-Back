import express from 'express';
import cors from 'cors';
import connexionRoutes from '/routes/connexion.js';
import carteDeJeuRoutes from '/routes/carteDeJeu.js';
import partieRoutes from '/routes/partie.js';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/connexion', connexionRoutes);
app.use('/carteDeJeu', carteDeJeuRoutes);
app.use('/partie', partieRoutes);


export { app };