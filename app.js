const express = require('express');
const bodyParser = require('body-parser');
//embeded js
const ejs = require('ejs');
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;

const findOrCreate = require('mongoose-findorcreate');
require('dotenv').config();

const app = express();

app.use(express.static('public'));
app.set('view engine', 'ejs');
app.use(
    bodyParser.urlencoded({
        extended: true,
    })
);

app.use(
    session({
        secret: 'secret.',
        resave: false,
        saveUninitialized: false,
    })
);

app.use(passport.initialize());
app.use(passport.session());
////////////////////////////////////////connection////////////////////////////////////////////////////
//mongoose
mongoose.connect(
    'mongodb+srv://reem97:remo151997@blogger-project.z3y56.mongodb.net/db?retryWrites=true&w=majority', { useNewUrlParser: true }
);
mongoose.set('useCreateIndex', true);
////////////////////////////////schema//////////////////////////////////////
const userSchema = new mongoose.Schema({
    username: String,
    email: String,
    password: String,
    googleId: String,
    facebookId: String,
    secret: String,
    value: String,
    image: String,
    provider: String,
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model('User', userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
    done(null, user.id);
});

passport.deserializeUser(function(id, done) {
    User.findById(id, function(err, user) {
        done(err, user);
    });
});
/////////////////////google authetication//////////////////////
passport.use(
    new GoogleStrategy({
            clientID: process.env.CLIENT_ID,
            clientSecret: process.env.CLIENT_SECRET,
            callbackURL: 'http://localhost:4000/auth/google/secrets',
            userProfileURL: 'https://www.googleapis.com/oauth2/v3/userinfo',
        },
        function(accessToken, refreshToken, profile, cb) {

            console.log(profile);
            User.findOrCreate({
                    provider: profile.provider,
                    username: profile.displayName,
                    value: profile.photos.value,
                    googleId: profile.id,
                    email: profile._json.email

                },
                function(err, user) {
                    return cb(err, user);
                }
            );
        }
    )
);
////////////////////////////facebook authentication/////////////////////////////////
passport.use(
    new FacebookStrategy({
            clientID: process.env.CLIENT_ID_FB,
            clientSecret: process.env.CLIENT_SECRET_FB,
            callbackURL: 'http://localhost:4000/auth/facebook/secrets',
            profileFields: ["email", "name"]
        },
        function(accessToken, refreshToken, profile, done) {
            console.log(profile);
            console.log(accessToken);
            //mommken use destruction _json
            User.findOrCreate({
                    provider: profile.provider,
                    facebookId: profile.id,
                    username: profile._json.first_name + ' ' +
                        profile._json.last_name,
                    email: profile._json.email
                },
                function(err, user) {
                    if (err) {
                        return done(err);
                    }

                    done(null, user);
                }
            );
        }
    )
);



////////////////////////////////////////////////////////////



app.get('/', function(req, res) {
    res.render('home');
});
//////////////////////apis///////google//////////////////////////
app.get(
    '/auth/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
);

app.get(
    '/auth/google/secrets',
    passport.authenticate('google', { failureRedirect: '/login' }),
    function(req, res) {
        res.redirect('/secrets');
    }
);
////////////////////facebook///////////////

app.get('/auth/facebook', passport.authenticate('facebook', {
    scope: ['public_profile', 'email']
}));
// app.get('/auth/facebook');
app.get(
    '/auth/facebook/secrets',
    passport.authenticate('facebook', {
        successRedirect: '/secrets',
        failureRedirect: '/login',
    })
);
////////////////////////////////////////////////////////////
app.get('/login', function(req, res) {
    res.render('login');
});

app.get('/register', function(req, res) {
    res.render('register');
});

app.get('/secrets', function(req, res) {
    User.find({ secret: { $ne: null } }, function(err, foundUsers) {
        if (err) {
            console.log(err);
        } else {
            if (foundUsers) {
                res.render('secrets');
            }
        }
    });
});

app.get('/logout', function(req, res) {
    req.logout();
    res.redirect('/');
});

app.post('/register', function(req, res) {
    User.register({ username: req.body.username },
        req.body.password,
        function(err, user) {
            if (err) {

                console.log(err);

                // res.redirect('/register');
            } else {
                passport.authenticate('local')(req, res, function() {
                    // res.redirect('/secrets');
                    // res.send('registred')

                    res.redirect('/register');
                });
            }
        }
    );
});

app.post('/login', function(req, res) {
    const user = new User({
        username: req.body.username,
        password: req.body.password,
    });

    req.login(user, function(err) {
        if (err) {
            console.log(err);
        } else {
            passport.authenticate('local')(req, res, function() {
                console.log('Logging in as: ' + req.user);
                // res.send('logged'),
                res.redirect('/secrets');
            });
        }
    });
});

app.listen(4000, function() {
    console.log('Server started on port 4000.');
});