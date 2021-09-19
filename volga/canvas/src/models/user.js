const mongoose = require('mongoose');
const validator = require('validator');
const jwt = require('jsonwebtoken');
const bcrypt = require("bcrypt");
const { DrawingSchema } = require('./drawing');


const UserSchema = new mongoose.Schema({
        name: {
            type:      String,
            required:  true,
            unique:    true,
            minlength: 3,
            maxlength: 42
        },
        email: {
            type:      String,
            required:  true,
            immutable: true,
            unique:    true,
            minlength: 5,
            maxlength: 255,
            lowercase: true,
            trim:      true,
            validate: [validator.isEmail, 'Invalid email address']
        },
        password: {
            type:      String,
            required:  true,
            minlength: 3,
            maxlength: 255
        },
        hmacKey: {
            type:      String,
            required:  false,
            default:   'key',
            minlength: 3,
            maxlength: 255
        },
        embedderType: {
            type:      String,
            required:  false,
            default:   '+-1',
            maxlength: 8
        },
        drawings: [DrawingSchema]
    },
    { timestamps: true },
);


UserSchema.statics.createUser = async function (name, email, password, hmacKey, embedderType) {
    const passwordHash = await bcrypt.hash(password, parseInt(process.env['PASS_SALT_LENGTH'], 10));
    let udef = {
        name:     name,
        password: passwordHash,
        email:    email
    };
    if (hmacKey !== undefined) {
        udef['hmacKey'] = hmacKey;
    }
    if (embedderType !== undefined) {
        udef['embedderType'] = embedderType;
    }
    return new User(udef);
};

UserSchema.statics.findByLogin = async function (login) {
    let user = await this.findOne({ name: login });
    if (!user) {
        user = await this.findOne({ email: login });
    }
    return user;
};

UserSchema.statics.verifyAuthToken = function (token) {
    return jwt.verify(token, process.env['JWT_PRIVATE_KEY']);
};


UserSchema.methods.generateAuthToken = function() {
    return jwt.sign({ _id: this._id }, process.env['JWT_PRIVATE_KEY']);
};

UserSchema.methods.checkPassword = async function (password) {
    return await bcrypt.compare(password, this.password);
};

UserSchema.methods.addDrawing = async function (name, description, drawingUrl, localFileName) {
    this.drawings.push({
        name:          name,
        description:   description,
        drawingUrl:    drawingUrl,
        localFileName: localFileName,
    });
    this.markModified('drawings');
    return this.drawings[this.drawings.length - 1];
};

UserSchema.methods.findDrawingById = async function (drawingId) {
    return this.drawings.id(drawingId);
};

UserSchema.methods.deleteDrawing = async function (drawingId) {
    this.drawings.id(drawingId).remove();
    this.markModified('drawings');
};


UserSchema.virtual('shortDescription').get(function() {
    return {
        _id:          this._id,
        name:         this.name,
        email:        this.email,
        hmacKey:      this.hmacKey,
        embedderType: this.embedderType,
    };
});

UserSchema.set('toJSON', {
    transform: function(doc, ret, options) {
        delete ret.password;
    }
});


const User = mongoose.model('User', UserSchema);
module.exports = User;
