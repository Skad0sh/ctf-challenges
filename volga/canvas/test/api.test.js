process.env.NODE_ENV = 'test';
const crypto = require('crypto');
const faker = require('faker');
const fs = require('fs');
const path = require('path');
PNG = require('pngjs').PNG;
const request = require('supertest');
const app = require('../src/server');
const { registerRandomUser } = require('./utils.js');
const dbHandler = require('./db-helper');


jest.useRealTimers();
jest.setTimeout(600000);

beforeAll(async () => await dbHandler.connect());
afterEach(async () => await dbHandler.clearDatabase());
afterAll(async () => await dbHandler.closeDatabase());


// region Utils

get_random_int = function(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
}

get_random_message = function() {
    return Buffer.from(faker.lorem.sentence()).toString( "base64" );
}

const randomImagesFolderPath = path.join(process.env['TMP_UPLOAD_FOLDER'], 'tests');
fs.mkdirSync(randomImagesFolderPath, { recursive: true });

generateRandomImage = function(alpha) {
    const get_random_int = function(max, min) {
        return Math.floor(Math.random() * max) + (min || 0);
    }
    const fileName = faker.system.fileName() + '.png';
    const filePath = path.join(randomImagesFolderPath, fileName);
    const width = get_random_int(512, 28);
    const height = get_random_int(512, 28);
    if (alpha) {
        const data = crypto.randomBytes(width * height * 4);
        let png = new PNG({ width: width, height: height, color: true, alpha: true });
        png.data = data;
        let buff = PNG.sync.write(png);
        fs.writeFileSync(filePath, buff);
    } else {
        const data = crypto.randomBytes(width * height * 3);
        let png = new PNG({ width: width, height: height, bitDepth: 8, colorType: 2, inputHasAlpha: false });
        png.data = data;
        let options = { colorType: 2 };
        let buff = PNG.sync.write(png, options);
        fs.writeFileSync(filePath, buff);
    }
    return [filePath, fileName];
}

uploadRandomImage = async function(token, withMessage) {
    const [filePath, fileName] = generateRandomImage();
    const description = faker.lorem.paragraph();
    const message = get_random_message();
    let req = request(app)
        .post('/api/drawing')
        .set('x-access-token', token)
        .field('name', fileName)
        .field('description', description);
    if (withMessage) {
        req = req.field('message', message);
    }
    req = req.attach('drawing', filePath);
    const res = await req;
    return [fileName, description, message, filePath, res];
}

// endregion Utils


describe('POST /api/drawing', () => {
    it('can create a new drawing for an authorised user ', async () => {
        // 1. register a user
        const [, token, _res] = await registerRandomUser();
        expect(_res.statusCode).toEqual(201);
        expect(_res.header).toHaveProperty('x-access-token');

        // 2. a drawing without an associated message
        // generate a random image and upload it
        let [filePath, fileName] = generateRandomImage();
        let description = faker.lorem.paragraph();
        let res = await request(app)
            .post('/api/drawing')
            .set('x-access-token', token)
            .field('name', fileName)
            .field('description', description)
            .attach('drawing', filePath);
        expect(res.statusCode).toEqual(201);

        // check the returned object
        expect(res.body).toHaveProperty('_id');
        expect(res.body.name).toEqual(fileName);
        expect(res.body.description).toEqual(description);
        expect(res.body).toHaveProperty('drawingUrl');

        // check the uploaded file
        // TODO: find out the wau to check statically served files
        // res = await request(app).get(res.body.drawingUrl).set('x-access-token', token);
        // expect(res.statusCode).toEqual(201);

        // 3. a drawing with an associated message
        // upload the same image - now with the `message` parameter
        description = faker.lorem.paragraph();
        let message = get_random_message();
        res = await request(app)
            .post('/api/drawing')
            .set('x-access-token', token)
            .field('name', fileName)
            .field('description', description)
            .field('message', message)
            .attach('drawing', filePath);
        expect(res.statusCode).toEqual(201);

        // check the returned object
        expect(res.body).toHaveProperty('_id');
        expect(res.body.name).toEqual(fileName);
        expect(res.body.description).toEqual(description);
        expect(res.body).toHaveProperty('drawingUrl');

        // check the uploaded file
        // TODO: find out the way to check statically served files
        // res = await request(app).get(res.body.drawingUrl).set('x-access-token', token);
        // expect(res.statusCode).toEqual(201);
    });
});


describe('GET /api/drawing/:drawingId', () => {
    it('can get an existing drawing', async () => {
        // 1. register a user and upload a drawing
        const [, token, ] = await registerRandomUser();
        const [, , , , resUpload] = await uploadRandomImage(token, true);
        const drawing = resUpload.body;

        // 2. get the drawing
        const res = await request(app).get('/api/drawing/' + drawing._id).set('x-access-token', token);
        expect(res.statusCode).toEqual(200);
        expect(res.body.name).toEqual(drawing.name);
        expect(res.body.description).toEqual(drawing.description);
        expect(res.body.drawingUrl).toEqual(drawing.drawingUrl);
    });
});


describe('GET /api/drawing', () => {
    it('can get a list of user\'s drawings', async () => {
        // 1. register a user
        const [, token, ] = await registerRandomUser();

        // 2. upload some drawings
        const nDrawings = get_random_int(1, 5);
        let drawings = {};
        for (let i = 0; i < nDrawings; ++i) {
            const [, , , , resUpload] = await uploadRandomImage(token, true);
            const drawing = resUpload.body;
            drawings[drawing._id] = drawing;
        }

        // 3. get the drawings
        const res = await request(app).get('/api/drawing').set('x-access-token', token);
        expect(res.statusCode).toEqual(200);
        expect(res.body.length).toEqual(nDrawings);
        for (let i = 0; i < nDrawings; ++i) {
            const drawingRes = res.body[i];
            expect(Object.keys(drawings)).toContain(drawingRes._id);
            const drawingGT = drawings[drawingRes._id];
            expect(drawingRes.name).toEqual(drawingGT.name);
            expect(drawingRes.description).toEqual(drawingGT.description);
            expect(drawingRes.drawingUrl).toEqual(drawingGT.drawingUrl);
            delete drawings[drawingRes._id];
        }
        expect(Object.keys(drawings).length).toEqual(0);
    });
});


describe('DELETE /api/drawing/:drawingId', () => {
    it('cat delete authorised user\'s drawings', async () => {
        // 1. register a user and upload a drawing
        const [, token, ] = await registerRandomUser();
        const [, , , , resUpload] = await uploadRandomImage(token, true);
        const drawing = resUpload.body;

        // 2. delete the drawing
        let res = await request(app).delete('/api/drawing/' + drawing._id).set('x-access-token', token);
        expect(res.statusCode).toEqual(200);

        // 3. get a list of all drawings and check that it's now empty
        res = await request(app).get('/api/drawing/').set('x-access-token', token);
        expect(res.statusCode).toEqual(200);
        expect(Object.keys(res.body).length).toEqual(0);
    });
});


describe('PUT /api/drawing/:drawingId', () => {
    it('authorised user can edit their drawings', async () => {
        // 1. register a user and upload a drawing
        const [, token, res] = await registerRandomUser();
        const [, , , , resUpload] = await uploadRandomImage(token, true);
        const drawing = resUpload.body;

        // 2. edit only metadata
        const name2 = faker.system.fileName();
        const description2 = faker.lorem.paragraph();
        const res2 = await request(app)
            .put('/api/drawing/' + drawing._id)
            .set('x-access-token', token)
            .field('name', name2)
            .field('description', description2);
        expect(res2.statusCode).toEqual(200);
        expect(res2.body._id).toEqual(drawing._id);
        expect(res2.body.name).not.toEqual(drawing.name);
        expect(res2.body.name).toEqual(name2);
        expect(res2.body.description).not.toEqual(drawing.description);
        expect(res2.body.description).toEqual(description2);
        expect(res2.body).toHaveProperty('drawingUrl');

        // 3. replace the image
        const [filePath3, ] = generateRandomImage();
        const res3 = await request(app)
            .put('/api/drawing/' + drawing._id)
            .set('x-access-token', token)
            .attach('drawing', filePath3);
        expect(res3.statusCode).toEqual(200);
        // TODO: check the re-uploaded file

        // 4. replace the image with the associated message
        const [filePath4, ] = generateRandomImage();
        const message4 = get_random_message();
        const res4 = await request(app)
            .put('/api/drawing/' + drawing._id)
            .set('x-access-token', token)
            .field('message', message4)
            .attach('drawing', filePath4);
        expect(res4.statusCode).toEqual(200);
        // TODO: check the re-uploaded file
    });
});
