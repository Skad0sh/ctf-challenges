const { User } = require('../models');


module.exports = async function(req, res, next) {
    const token = req.headers['x-access-token'] || req.headers['authorization'];
    if (!token)
        return res.status(401).send('Access denied');

    try {
        // check the token
        const userInfo = User.verifyAuthToken(token);

        // check if the user exists
        let user = await User.findById(userInfo._id);
        if (!user)
            return res.status(400).send({ error: 'Invalid token' });

        // save user's _id and proceed
        req.user = userInfo;
        next();
    } catch (error) {
        res.status(400).send({ error: 'Invalid token' });
    }
};
