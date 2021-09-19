const cors = require('cors')
const express = require('express')
const morgan = require('morgan')
const mongoose = require('mongoose');
const routes = require('./routes');
const { auth } = require("./middlewares");
const models = require('./models');
const fs = require("fs");


// Environment variables
const host = process.env.ADDRESS || '0.0.0.0'
const port = process.env.PORT || 13631
const conn_string = process.env.DATABASE_CONN_STR || 'mongodb://localhost:27017/canvas'
const recreate_db = 'RECREATE_DATABASE' in process.env
process.env['JWT_PRIVATE_KEY'] = process.env.JWT_PRIVATE_KEY || 'the-most-secret-secret'
process.env['PASS_SALT_LENGTH'] = process.env.JWT_PRIVATE_KEY || '10'
process.env['TMP_UPLOAD_FOLDER'] = process.env.TMP_UPLOAD_FOLDER || '/tmp/canvas-uploads'
process.env['ROOT'] = process.env.ROOT || '/opt/canvas/data'

fs.mkdirSync(process.env['TMP_UPLOAD_FOLDER'], { recursive: true });
fs.mkdirSync(process.env['ROOT'], { recursive: true });

// Init the app
const app = express();
app.use(cors());
app.use(function (req, res, next) {
    res.header('Access-Control-Expose-Headers', 'x-access-token');
    next();
});
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('combined'));
}

// Routing and middleware
app.post('/register', routes.idm.reg);
app.get('/remove', auth, routes.idm.rem);
app.post('/login', routes.idm.login);
app.get('/logout', auth, routes.idm.logout)
app.get('/whoami', auth, routes.idm.whoami)
app.use('/api', routes.api);

app.use(express.static(process.env['ROOT']));

app.use(function(error, req, res, next) {
    if (!error.statusCode) error.statusCode = 500;
    console.log(error);
    return res
        .status(error.statusCode)
        .json({ error: error.toString() });
});

// Connect to the DB and serve
if (process.env.NODE_ENV === 'test') {
    module.exports = app;
}
else {
    mongoose.connect(conn_string).then(async () => {
        if (recreate_db) {
            await Promise.all([models.User.deleteMany({})]);
        }
        app.listen(port, host, () => {
            console.log('process.env.ROOT:', process.env.ROOT)
            console.log(`App is listening at ${host}:${port}`)
        })
    });
}
