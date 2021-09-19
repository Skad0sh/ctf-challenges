process.env.NODE_ENV = 'test';
const faker = require('faker');
const dbHandler = require('./db-helper');
const models = require('../src/models');

const fi = faker.internet;

jest.useRealTimers();
jest.setTimeout(600000);

beforeAll(async () => await dbHandler.connect());
afterEach(async () => await dbHandler.clearDatabase());
afterAll(async () => await dbHandler.closeDatabase());


describe('Models tests', () => {
    describe('Drawing', () => {
        const test_created = async function(undefinedDescription) {
            const user = await models.User.createUser(fi.userName(), fi.email(), fi.password(), fi.password());
            const name = faker.name.firstName();
            const description = undefinedDescription ? undefined : faker.lorem.paragraph();
            const drawingUrl = faker.internet.url();
            const localFileName = faker.system.directoryPath();

            const drawing = await user.addDrawing(name, description, drawingUrl, localFileName);
            await user.save();

            const user2 = await models.User.findById(user._id);
            const fetched = await user2.findDrawingById(drawing._id.toString());

            expect(drawing).not.toBeNull();
            expect(drawing.name).toBe(name);
            expect(drawing.description).toBe(undefinedDescription ? '' : description);
            expect(drawing.drawingUrl).toBe(drawingUrl);
            expect(drawing.localFileName).toBe(localFileName);

            expect(fetched).not.toBeNull();
            expect(fetched.name).toBe(name);
            expect(fetched.description).toBe(undefinedDescription ? '' : description);
            expect(fetched.drawingUrl).toBe(drawingUrl);
            expect(fetched.localFileName).toBe(localFileName);
        }

        // 1. create a Drawing
        describe('Create', () => {
            it('can be created with full info', async () => {
                await test_created(false);
            });

            it('can be created without description', async () => {
                await test_created(true);
            });

            it('can\'t be created without any of {`name`, `drawingUrl`, `localFileName`}', async () => {
                const user = await models.User.createUser(fi.userName(), fi.email(), fi.password(), fi.password());
                const name = faker.name.firstName();
                const description = faker.lorem.paragraph();
                const drawingUrl = faker.internet.url();
                const localFileName = faker.system.directoryPath();

                // i. no name
                await user.addDrawing(undefined, description, drawingUrl, localFileName);
                await expect(user.save()).rejects.toThrowError(/Path `name` is required/);

                // ii. no drawingUrl
                await user.addDrawing(name, description, undefined, localFileName);
                await expect(user.save()).rejects.toThrowError(/Path `drawingUrl` is required/);

                // iii. no localFileName
                await user.addDrawing(name, description, drawingUrl, undefined);
                await expect(user.save()).rejects.toThrowError(/Path `localFileName` is required/);
            });

            it ('can\'t be created with too long or too short {`name`, `description`, `drawingUrl`, `localFileName`}', async () => {
                const name = faker.name.firstName();
                const description = faker.lorem.paragraph();
                const drawingUrl = faker.internet.url();
                const localFileName = faker.system.directoryPath();

                // i. len(name) <= 255
                let user = await models.User.createUser(fi.userName(), fi.email(), fi.password(), fi.password());
                await user.addDrawing('A'.repeat(256), description, drawingUrl, localFileName);
                await expect(user.save())
                    .rejects.toThrowError(/(.*)Path `name`(.*)is longer than the maximum allowed length \(255\)./);

                // ii. len(description) <= 512
                user = await models.User.createUser(fi.userName(), fi.email(), fi.password(), fi.password());
                await user.addDrawing(name, 'A'.repeat(513), drawingUrl, localFileName);
                await expect(user.save())
                    .rejects.toThrowError(/(.*)Path `description`(.*)is longer than the maximum allowed length \(512\).(.*)/);

                // iii. 1 <= len(drawingUrl)
                user = await models.User.createUser(fi.userName(), fi.email(), fi.password(), fi.password());
                await user.addDrawing(name, description, '', localFileName);
                await expect(user.save()).rejects.toThrowError(/Path `drawingUrl` is required./);

                // iv. len(drawingUrl) <= 255
                user = await models.User.createUser(fi.userName(), fi.email(), fi.password(), fi.password());
                await user.addDrawing(name, description, 'A'.repeat(256), localFileName);
                await expect(user.save())
                    .rejects.toThrowError(/(.*)Path `drawingUrl`(.*)is longer than the maximum allowed length \(255\).(.*)/);

                // v. 1 <= len(localFileName)
                user = await models.User.createUser(fi.userName(), fi.email(), fi.password(), fi.password());
                await user.addDrawing(name, description, drawingUrl, '');
                await expect(user.save()).rejects.toThrowError(/Path `localFileName` is required./);

                // vi. len(localFileName) <= 255
                user = await models.User.createUser(fi.userName(), fi.email(), fi.password(), fi.password());
                await user.addDrawing(name, description, drawingUrl, 'A'.repeat(256));
                await expect(user.save())
                    .rejects.toThrowError(/(.*)Path `localFileName`(.*)is longer than the maximum allowed length \(255\).(.*)/);
            });
        });  // describe 'Create'

        // 2. edit a Drawing
        describe('Edit', () => {
            it('`name` can be edited correctly', async () => {
                const user = await models.User.createUser(fi.userName(), fi.email(), fi.password(), fi.password());
                const name = faker.name.firstName();
                const description = faker.lorem.paragraph();
                const drawingUrl = faker.internet.url();
                const localFileName = faker.system.directoryPath();

                const drawing = await user.addDrawing(name, description, drawingUrl, localFileName);
                await user.save();
                drawing.name = name + '42';
                await user.save();

                const user2 = await models.User.findById(user._id);
                const fetched = await user2.findDrawingById(drawing._id.toString());

                expect(drawing).not.toBeNull();
                expect(drawing.name).toBe(name + '42');
                expect(drawing.description).toBe(description);
                expect(drawing.drawingUrl).toBe(drawingUrl);
                expect(drawing.localFileName).toBe(localFileName);

                expect(fetched).not.toBeNull();
                expect(fetched.name).toBe(name + '42');
                expect(fetched.description).toBe(description);
                expect(fetched.drawingUrl).toBe(drawingUrl);
                expect(fetched.localFileName).toBe(localFileName);
            });

            it('`description` can be edited correctly', async () => {
                const user = await models.User.createUser(fi.userName(), fi.email(), fi.password(), fi.password());
                const name = faker.name.firstName();
                const description = faker.lorem.paragraph();
                const drawingUrl = faker.internet.url();
                const localFileName = faker.system.directoryPath();

                const drawing = await user.addDrawing(name, description, drawingUrl, localFileName);
                await user.save();
                drawing.description = description + '42';
                await user.save();

                const user2 = await models.User.findById(user._id);
                const fetched = await user2.findDrawingById(drawing._id.toString());

                expect(drawing).not.toBeNull();
                expect(drawing.name).toBe(name);
                expect(drawing.description).toBe(description + '42');
                expect(drawing.drawingUrl).toBe(drawingUrl);
                expect(drawing.localFileName).toBe(localFileName);

                expect(fetched).not.toBeNull();
                expect(fetched.name).toBe(name);
                expect(fetched.description).toBe(description + '42');
                expect(fetched.drawingUrl).toBe(drawingUrl);
                expect(fetched.localFileName).toBe(localFileName);
            });

            it('neither of {`drawingUrl`, `localFileName`} can be edited', async () => {
                let user = await models.User.createUser(fi.userName(), fi.email(), fi.password(), fi.password());
                const name = faker.name.firstName();
                const description = faker.lorem.paragraph();
                const drawingUrl = faker.internet.url();
                const localFileName = faker.system.directoryPath();

                // i. drawingUrl
                let drawing = await user.addDrawing(name, description, drawingUrl, localFileName);
                await user.save();
                drawing.drawingUrl = drawingUrl + '42';
                await user.save();
                let user2 = await models.User.findById(user._id);
                let fetched = await user2.findDrawingById(drawing._id.toString());

                expect(drawing).not.toBeNull();
                expect(drawing.drawingUrl).not.toBe(drawingUrl + '42');
                expect(fetched).not.toBeNull();
                expect(fetched.drawingUrl).not.toBe(drawingUrl + '42');

                // ii. localFileName
                user = await models.User.createUser(fi.userName(), fi.email(), fi.password(), fi.password());
                drawing = await user.addDrawing(name, description, drawingUrl, localFileName);
                await user.save();
                drawing.localFileName = localFileName + '42';
                await user.save();
                user2 = await models.User.findById(user._id);
                fetched = await user2.findDrawingById(drawing._id.toString());

                expect(drawing).not.toBeNull();
                expect(drawing.localFileName).not.toBe(localFileName + '42');
                expect(fetched).not.toBeNull();
                expect(fetched.localFileName).not.toBe(localFileName + '42');
            });
        });  // describe 'Edit'

        // 3. edit a Drawing
        describe('toJSON', () => {
            it('strips the fields `_id` and `localFileName`', async () => {
                let user = await models.User.createUser(fi.userName(), fi.email(), fi.password(), fi.password());
                let drawing = await user.addDrawing(faker.name.firstName(), faker.lorem.paragraph(),
                    faker.internet.url(), faker.system.directoryPath());
                let j = drawing.toJSON();

                expect(j._id).toBe(undefined);
                expect(j.localFileName).toBe(undefined);
            });
        });
    });  // describe 'Drawing'

});  // describe 'Models tests'
