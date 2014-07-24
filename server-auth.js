// load authentication strategy
var BasicStrategy = require('passport-http').BasicStrategy;

/**
 *  Authentication strategies
 *  @param {object} passport Passport dependency
 */
module.exports = function(passport) {

    // serialize the user for the session
    passport.serializeUser(function(user, done) {
        return done(null, true);
    });

    // deserialize the user for the session
    passport.deserializeUser(function(id, done) {
        return done(err, true);
    });

    // basic http auth
    passport.use(new BasicStrategy(
        function(username, password, done) {
            // username and password for private alpha auth
            return done(null, (username === 'HueNote' && password === 'Selfware14'));
        }
    ));

};
