const express = require('express');
const bodyParser = require('body-parser');
const { sequelize } = require('./models');
const connexionRoutes = require('./routes/connexion');
const carteDeJeuRoutes = require('./routes/carteDeJeu');
const partieRoutes = require('./routes/partie');

const app = express();
app.use(bodyParser.json());

app.use('/connexion', connexionRoutes);
app.use('/carteDeJeu', carteDeJeuRoutes);
app.use('/partie', partieRoutes);

const PORT = process.env.PORT || 3000;

sequelize.sync({ force: true }).then(() => {
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
});