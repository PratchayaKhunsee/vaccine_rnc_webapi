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

// configure passport.js to use the local strategy
passport.use(new LocalStrategy({
        usernameField: 'username',
        passwordField: 'password'
    },
    function verify(username, password, done) {
        (async () => {
            let result = await (await login(username, password));
            // console.log(username, password);
            if(result instanceof LoginError){
                done(result);
                return;
            }

            done(null, result);
        })();
    }
));
// tell passport how to serialize the user
passport.serializeUser((user, done) => {
    // console.log('Inside serializeUser callback. User id is save to the session file store here')
    done(null, user.id);
});
// Setting middlewares for the app.
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
    (async () => {

        res.set({
            'Content-Type': 'application/json'
        });

        try {
            passport.authenticate('local', function (err, user) {
                // console.log(arguments);
                if(err){
                    throw err;
                }

                req.login(user)
            })(req, res, next);

            res.send("true");
        } catch (error) {
            res.send("false");
        }
    })();
});

app.listen(port, function () {});