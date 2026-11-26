const express = require('express');
const http = require('http');
const bodyParser = require('body-parser');
const { sequelize } = require('./models');
const carteDeJeuRoutes = require('./routes/carteDeJeu');
const partieRoutes = require('./routes/partie');
const userRoutes = require('./routes/user');
const cors = require('cors');
const { Server } = require('socket.io');
const registerSocketHandlers = require('./sockets');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: 'http://localhost:4200',
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
    }
});

app.use(bodyParser.json());
app.use(cors());

app.use('/user', userRoutes);
app.use('/carteDeJeu', carteDeJeuRoutes);
app.use('/partie', partieRoutes);

registerSocketHandlers(io);

const PORT = process.env.PORT || 3000;

sequelize.sync({ alter: true }).then(() => {
    server.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
});
