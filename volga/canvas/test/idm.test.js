process.env.NODE_ENV = 'test';
const request = require('supertest');
const faker = require('faker');
const app = require('../src/server');
const dbHandler = require('./db-helper');
const { registerRandomUser } = require('./utils.js');


jest.useRealTimers();
jest.setTimeout(600000);

beforeAll(async () => await dbHandler.connect());
afterEach(async () => await dbHandler.clearDatabase());
afterAll(async () => await dbHandler.closeDatabase());


describe('POST /register', () => {
    it('can register with full user description', async () => {
        const data = {
            name:     faker.name.firstName(),
            email:    faker.internet.email(),
            password: faker.internet.password(),
        }
        const res = await request(app).post('/register').send(data);
        expect(res.statusCode).toEqual(201);
        expect(res.body).toHaveProperty('_id');
        expect(res.body.name).toEqual(data.name);
        expect(res.body.email).toEqual(data.email);
        expect(res.header).toHaveProperty('x-access-token');
    });
});


describe('POST /login', () => {
    it('can login after registering', async () => {
        const [userData, , ] = await registerRandomUser();
        const res = await request(app).post('/login').send({
            name: userData.name,
            password: userData.password,
        });
        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('_id');
        expect(res.body.name).toEqual(userData.name);
        expect(res.body.email).toEqual(userData.email);
        expect(res.body.hmacKey).toEqual(userData.hmacKey);
        expect(res.body.embedderType).toEqual(userData.embedderType);
        expect(res.header).toHaveProperty('x-access-token');
    });
});


describe('GET /remove', () => {
    it('can sign out a newly registered user', async () => {
        const [userData, token, ] = await registerRandomUser();

        let res = await request(app).get('/remove').set('x-access-token', token).send({});
        expect(res.statusCode).toEqual(200);
        expect(res.header).not.toHaveProperty('x-access-token');

        res = await request(app).post('/login').send({
            name: userData.name,
            password: userData.password,
        });
        expect(res.statusCode).toEqual(400);
        expect(res.body).toHaveProperty('error');
        expect(res.body.error).toEqual('Invalid username or password');
    });
});


describe('GET /whoami', () => {
    it('can identify authorised registered user', async () => {
        const [userData, token, ] = await registerRandomUser();
        const res = await request(app).get('/whoami').set('x-access-token', token).send({});
        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('_id');
        expect(res.body.name).toEqual(userData.name);
        expect(res.body.email).toEqual(userData.email);
        expect(res.body.hmacKey).toEqual(userData.hmacKey);
        expect(res.body.embedderType).toEqual(userData.embedderType);
    });
});
