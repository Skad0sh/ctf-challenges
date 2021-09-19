/*
 *  Shamelessly stolen from https://dev.to/paulasantamaria/testing-node-js-mongoose-with-an-in-memory-database-32np
 *    and updated for version 7.0
 */
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');


/**
 * Create database instance
 */
let mongod = undefined;
createInstance = async function() {
    if (mongod === undefined) {
        mongod = await MongoMemoryServer.create();
    }
    return mongod;
}


/**
 * Connect to the in-memory database.
 */
connect = async function() {
    await createInstance();
    const uri = mongod.getUri();
    await mongoose.connect(uri);
}

/**
 * Drop database, close the connection and stop mongod.
 */
closeDatabase = async function() {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await mongod.stop();
    mongod = undefined;
}

/**
 * Remove all the data for all db collections.
 */
clearDatabase = async function() {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
        const collection = collections[key];
        await collection.deleteMany();
    }
}


module.exports = { connect, closeDatabase, clearDatabase };
