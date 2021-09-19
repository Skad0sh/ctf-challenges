const router = require('express').Router();
const url = require("url");
const multer  = require('multer');
const uuid4 = require("uuid").v4;
const fs = require('fs');
const path = require("path");
const { auth } = require("../middlewares");
const { User } = require("../models");
const { wasmModule } = require('../lib');


// setup multer
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, process.env['TMP_UPLOAD_FOLDER']);
    },
    filename: function (req, file, cb) {
        const fullName = uuid4().replace(/-/g, '') + path.extname(file.originalname);
        cb(null, fullName);
    },
    fileFilter: function (req, file, cb) {
        const fileTypes = /png/;
        const extName = fileTypes.test(path.extname(file.originalname));
        file.originalname.toLowerCase();
        const mimeType = fileTypes.test(file.mimetype);
        if (extName && mimeType) {
            cb(null, true);
        } else {
            cb('Invalid image format: only png is allowed!');
        }
    },
});
const upload = multer({ storage: storage });


processImage = function(embedderType, hmacKey, message, imagePath) {
    const embedder = new wasmModule.get_embedder(embedderType);
    try {
        embedder.process(imagePath, imagePath, hmacKey, message);
    } catch (e) {
        try { console.log('caught WASM exception: ' + wasmModule.translate_exception(e)); }
        catch { console.log('caught WASM exception: ' + e); }
        throw e;
    } finally {
        if (embedder) embedder.delete();
    }
}


router.post('/drawing', auth, upload.single('drawing'), async (req, res, next) => {
    // the method to create a new drawing
    try {
        // 1. get the user document
        let user = await User.findById(req.user._id);
        if (!user)
            return res.status(400).send({ error: 'Invalid user ID' });

        // 2. check the request
        if (req.body.name === undefined)
            return res.status(400).send({ error: 'Invalid drawing name' });
        if (req.file === undefined)
            return res.status(400).send({ error: 'A .png file must be uploaded' });
        if (req.body.embedderType !== undefined &&
            (req.body.embedderType !== 'lsb' || req.body.embedderType !== '+-1'))
            return res.status(400).send({ error: 'Invalid embedder type' });

        // 3. copy the file to user's file storage
        fs.mkdirSync(path.join(process.env['ROOT'], user.name), { recursive: true });
        fs.copyFileSync(req.file.path, path.join(process.env['ROOT'], user.name, req.file.filename));

        // 4. generate image's name and embed the message (if any is given)
        const embedderType = req.body.embedderType || user.embedderType;
        const hmacKey = req.body.hmacKey || user.hmacKey;
        if (req.body.message !== undefined) {
            const message = Buffer.from(req.body.message, 'base64');
            processImage(embedderType, hmacKey, message, path.join(user.name, req.file.filename));
        }

        // 5. create a Drawing document and save to the DB
        const drawingUrl = url.format({
            protocol: req.protocol,
            host:     req.get('host'),
            pathname: path.join(user.name, req.file.filename)  // req.originalUrl
        });
        const drawing = await user.addDrawing(req.body.name, req.body.description, drawingUrl, req.file.filename);
        await user.save();

        // 6. return 201 and ID of the newly created drawing
        return res.status(201).send(drawing);
    }  catch (error) { next(error); }
});

router.put('/drawing/:drawingId', auth, upload.single('drawing'), async (req, res, next) => {
    // the method to edit a drawing
    try {
        // 1. get the user document
        let user = await User.findById(req.user._id);
        if (!user)
            return res.status(400).send({ error: 'Invalid user ID' });

        // 2. get the drawing document
        let drawing = await user.findDrawingById(req.params.drawingId);
        if (!drawing)
            return res.status(400).send({ error: 'Invalid drawing ID' });

        // 3. check the request
        if (req.body.embedderType !== undefined &&
            (req.body.embedderType !== 'lsb' || req.body.embedderType !== '+-1'))
            return res.status(400).send({ error: 'Invalid embedder type' });

        // 4. if the file is being updated and embed the message (if any is given)
        if (req.file !== undefined) {
            // 4.1 copy the file to user's file storage
            fs.mkdirSync(path.join(process.env['ROOT'], user.name), { recursive: true });
            fs.copyFileSync(req.file.path, path.join(process.env['ROOT'], user.name, drawing.localFileName));

            // 4.2 embed the message if given
            if( req.body.message !== undefined) {
                const embedderType = req.body.embedderType || user.embedderType;
                const hmacKey = req.body.hmacKey || user.hmacKey;
                const message = Buffer.from(req.body.message, 'base64');
                processImage(embedderType, hmacKey, message, path.join(user.name, drawing.localFileName));
            }
        }

        // 5. update the Drawing document and save to the DB
        if (req.body.name !== undefined)
            drawing.name = req.body.name;
        if (req.body.description !== undefined)
            drawing.description = req.body.description;
        await user.save();

        // 6. return 200 and ID of the newly created drawing
        return res.status(200).send(drawing);
    }  catch (error) { next(error); }
});

router.delete('/drawing/:drawingId', auth, async (req, res, next) => {
    // the method to delete the drawing
    try {
        // 1. get the user document
        let user = await User.findById(req.user._id);
        if (!user)
            return res.status(400).send({ error: 'Invalid user ID' });

        // 2. get the drawing document
        let drawing = await user.findDrawingById(req.params.drawingId);
        if (!drawing)
            return res.status(400).send({ error: 'Invalid drawing ID' });

        // 3. delete the drawing and return 200
        await user.deleteDrawing(drawing._id);
        await user.save();

        return res.status(200).send({});
    }  catch (error) { next(error); }
});

router.get('/drawing/:drawingId', auth, async (req, res, next) => {
    // the method to get the drawing
    try {
        // 1. get the user document
        let user = await User.findById(req.user._id);
        if (!user)
            return res.status(400).send({ error: 'Invalid user ID' });

        // 2. get the drawing document
        let drawing = await user.findDrawingById(req.params.drawingId);
        if (!drawing)
            return res.status(400).send({ error: 'Invalid drawing ID' });

        // 3. return 200 and the drawing document
        return res.status(200).send(drawing);
    }  catch (error) { next(error); }
});

router.get('/drawing', auth, async (req, res, next) => {
    // the method to get a list of the user's drawings
    try {
        // 1. get the user document
        let user = await User.findById(req.user._id);
        if (!user)
            return res.status(400).send({ error: 'Invalid user ID' });

        // 2. return 200 and an array of the user's drawings
        return res.status(200).send(user.drawings);
    }  catch (error) { next(error); }
});


module.exports = router;
