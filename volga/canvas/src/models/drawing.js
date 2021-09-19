const mongoose = require('mongoose');


const DrawingSchema = new mongoose.Schema({
        name: {
            type:      String,
            required:  true,
            maxlength: 255
        },
        description: {
            type:      String,
            default:   '',
            maxlength: 512
        },
        drawingUrl: {
            type:      String,
            required:  true,
            immutable: true,
            minlength: 1,
            maxlength: 255
        },
        localFileName: {
            type:      String,
            required:  true,
            immutable: true,
            minlength: 1,
            maxlength: 255
        },
    },
    { timestamps: true },
);

DrawingSchema.set('toJSON', {
    transform: function(doc, ret, options) {
        delete ret.localFileName;
    }
});

module.exports = { DrawingSchema };
