const { User } = require('../models');


reg = async function(req, res, next) {
    try {
        // find if a user with the given email
        let user = await User.findByLogin(req.body.email);
        if (user)
            return res.status(400).send({ error: 'User already registered' });

        // create a new User document
        user = await User.createUser(req.body.name, req.body.email, req.body.password, req.body.hmacKey, req.body.embedderType);
        await user.save();

        // generate a new token and login the user
        const token = user.generateAuthToken();
        res.status(201).header('x-access-token', token).send(user.shortDescription);
    } catch (error) { next(error) }
}

rem = async function(req, res, next) {
    try {
        // get the user document
        let user = await User.findById(req.user._id);
        if (!user)
            return res.status(400).send({ error: 'Invalid username or password' });

        // delete the user
        await user.remove();

        // sign out the user and return 200
        return logout(req, res);
    } catch (error) { next(error) }
}

login = async function(req, res, next) {
    try {
        // find an existing user
        let user = await User.findByLogin(req.body.name);
        if (!user)
            return res.status(400).send({ error: 'Invalid username or password' });

        // check the password
        const match = await user.checkPassword(req.body.password);
        if (match) {
            const token = user.generateAuthToken();
            res.status(200).header('x-access-token', token).send(user.shortDescription);
        } else {
            return res.status(400).send({ error: 'Invalid username or password' });
        }
    } catch (error) { next(error) }
}

logout = function(req, res){
    delete req.headers['x-auth-token'];
    return res.status(200).send({});
}

whoami = async function(req, res, next) {
    try {
        const user = await User.findById(req.user._id).select("-password");
        res.status(200).send(user.shortDescription);
    } catch (error) { next(error) }
}


module.exports = {
    reg,
    rem,
    login,
    logout,
    whoami
};
