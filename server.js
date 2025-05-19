const express = require('express');
const bodyParser = require('body-parser');
const { sequelize } = require('./models');
const carteDeJeuRoutes = require('./routes/carteDeJeu');
const partieRoutes = require('./routes/partie');
const userRoutes = require('./routes/user');
const cors = require('cors');

const app = express();
app.use(bodyParser.json());
app.use(cors());

app.use('/user', userRoutes);
app.use('/carteDeJeu', carteDeJeuRoutes);
app.use('/partie', partieRoutes);

const PORT = process.env.PORT || 3000;

// const corsOptions = {
//     origin: 'http://localhost:4200', // Autoriser uniquement cette origine
//     methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Méthodes HTTP autorisées
//     allowedHeaders: ['Content-Type', 'Authorization'], // En-têtes autorisés
// };

sequelize.sync({ force: true }).then(() => {
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
});