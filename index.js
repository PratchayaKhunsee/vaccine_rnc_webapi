const express = require('express');
const app = express();
const session = require('express-session');
const uuid = require('uuid').v4;
const bodyParser = require('body-parser');
const FileStore = require('session-file-store')(session);
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const login = require('./response/login');
const {
    LoginError
} = require('./error');
let port = process.env.PORT || 8080;

// Configure passport.js to use the local strategy
passport.use(new LocalStrategy({
        usernameField: 'username',
        passwordField: 'password'
    },
    function verify(username, password, done) {
        (async () => {
            let result = await (await login(username, password));
            if (result instanceof LoginError) {
                done(result);
                return;
            }

            done(null, {
                username,
                info: result
            });
        })();
    }
));
// Telling passport how to serialize the user
passport.serializeUser((user, done) => {
    done(null, user.username);
});
// Setting middlewares for the app
app.use(session({
    genid() {
        return uuid();
    },
    secret: Math.random().toString().replace(/^0\./g, ''),
    resave: false,
    saveUninitialized: true,
    store: new FileStore()
}));
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());
app.use(passport.initialize());
app.use(passport.session());

// Setting routing for accesing the app
app.get('/', function (req, res) {
    res.send('...');
});
app.post('/login', function (req, res, next) {
    
    res.set({
        'Content-Type': 'application/json'
    });

    if(req.user){
        res.send("true");
        return;
    }

    passport.authenticate('local', function (err, user) {
        if (err) {
            res.send("false");
            return;
        }

        req.login(user, function done() {
            res.send("true");
        });
    })(req, res, next);
});

app.listen(port, function () {});