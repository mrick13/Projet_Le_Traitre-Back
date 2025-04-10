import request from 'supertest';
import { app } from '../app.js';

describe('POST /connexion/register', () => {
    it('should register a new user successfully', async () => {
        const response = await request(app).post('/connexion/register').send({
            email: 'aymeric.baud@icloud.com',
            password: 'password',
            pseudo: 'test',
        });

        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('email', 'aymeric.baud@icloud.com');
        expect(response.body).toHaveProperty('pseudo', 'test');
    });

    it('should fail if email already exists', async () => {
        await request(app).post('/connexion/register').send({
            email: 'aymeric.baud@icloud.com',
            password: 'password',
            pseudo: 'test',
        });

        const response = await request(app).post('/connexion/register').send({
            email: 'aymeric.baud@icloud.com',
            password: 'password123',
            pseudo: 'testuser2',
        });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error', 'Cet email est déjà utilisé.');
    });
});