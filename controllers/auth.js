const passport = require('passport'); //not sure if i need that here, I have my passport init in the server files.
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');

const pool = require('../db/index');

module.exports = (passport) => {
    const query = async (queryString, params) => {
        return await pool.query(queryString, params);
    };

    passport.use(
        new LocalStrategy ( async ( username, password, done) => {
            try {
                const querySchema = { name: 'user', email: `${username}`};
                const queryString = `SELECT * FROM user_customer WHERE email = $1`;
                const userResult = await query(queryString, [querySchema.email]);

                if (userResult.rows.length === 0 ) {
                    return done(null, false, { message: 'User not found' });
                }

                const foundUser = userResult.rows[0];

                const isMatch = await bcrypt.compare(password, foundUser.password);
                if (isMatch) {
                    return done(null, { //rather than an object here, does it just need to say 'user' after null?
                        id: foundUser.id,
                        email: foundUser.email,
                        firstName: foundUser.first_name,
                        lastName: foundUser.last_name
                    });
                } else {
                    return done(null, false, {message: 'Incorrect password '});
                }
            } catch (err) {
                console.error('Error during authentication. ' + err);
                return done(err);
            }
        })
    );

    passport.serializeUser((user, done) => {
        done(null, user.id);
    });

    passport.deserializeUser(async (id, done) => {
        try {
            const userResult = await query('SELECT * FROM user_customer WHERE id = $1',
                [id]
            );
            if (userResult.rows.length === 0) {
                return done(new Error('User not found'));
            } return done(null, userResult.rows[0].id);
        } catch(err) {
            done(err);
        }
    });
};

module.exports.isAuth = (req, res, next) => {

    if (req.isAuthenticated()) {
        next();
    } else {
        res.status(401).json({ msg: 'You are not authorized to view this resource' });
    }
}