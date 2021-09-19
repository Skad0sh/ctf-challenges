const faker = require("faker");
const request = require("supertest");
const app = require("../src/server");


registerRandomUser = async function() {
    const userData = {
        name:         faker.name.firstName(),
        email:        faker.internet.email().toLowerCase(),
        password:     faker.internet.password(),
        hmacKey:      faker.internet.password(),
        embedderType: '+-1',
    }
    const res = await request(app).post('/register').send(userData);
    return [userData, res.header['x-access-token'], res];
}

login = async function(username, password) {
    const res = await request(app).post('/register').send({
        name:     username,
        password: password,
    });
    return [res.header['x-access-token'], res];
}

module.exports = { registerRandomUser, login };
