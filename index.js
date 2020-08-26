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
// passport.use(new LocalStrategy({
//         usernameField: 'email'
//     },
//     (email, password, done) => {
//         console.log('Inside local strategy callback')
//         // here is where you make a call to the database
//         // to find the user based on their username or email address
//         // for now, we'll just pretend we found that it was users[0]
//         const user = users[0]
//         if (email === user.email && password === user.password) {
//             console.log('Local strategy returned true')
//             return done(null, user)
//         }
//     }
// ));

// tell passport how to serialize the user
// passport.serializeUser((user, done) => {
//     console.log('Inside serializeUser callback. User id is save to the session file store here')
//     done(null, user.id);
// });

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

// Setting routing for accesing the app
app.get('/', function (req, res) {
    res.send('...');
});
app.post('/login', function (req, res) {
    (async () => {

        res.set({
            'Content-Type': 'application/json'
        });

        try {
            let loginSuccess = await (await login(req.body.username, req.body.password));
            if (loginSuccess instanceof LoginError) {
                res.send("false");
                return;
            }


            // await new Promise(function(yes, no){
            //     passport.authenticate('local', (err, user, info) => {
            //         req.login(user);
            //         yes();
            //     });
            // });
            
            res.send("true");
        } catch (error) {
            res.send("false");
        }
    })();
});

app.listen(port, function () {});