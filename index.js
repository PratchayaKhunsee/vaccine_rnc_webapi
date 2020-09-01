const express = require('express');
const app = express();
const session = require('express-session');
const uuid = require('uuid').v4;
const bodyParser = require('body-parser');
const FileStore = require('session-file-store')(session);
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const login = require('./api/login');
const signin = require('./api/signin');
const {
    LoginError,
    SigninError
} = require('./error');
const {
    viewCertifications,
    createCertification,
    editCertification
} = require('./api/certificate');
const {
    viewPatient,
    viewRecords,
    createPatient,
    createRecord,
    editPatient,
    doVaccination
} = require('./api/record');
const { viewParenting, createParenting } = require('./api/parenting');

let port = process.env.PORT || 8080;

// Configure passport.js to use the local strategy
passport.use(new LocalStrategy({
        usernameField: 'username',
        passwordField: 'password'
    },
    function verify(username, password, done) {
        (async () => {
            let result = await login(username, password);
            if (result instanceof LoginError) {
                done(result);
                return;
            }

            done(null, result);
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
    // Response as JSON file
    res.set({
        'Content-Type': 'application/json'
    });

    if (req.user) {
        res.send("true");
        return;
    }

    // Using passport.js for login authentication
    passport.authenticate('local', function (err, user) {
        if (err) {
            res.send("false");
            return;
        }

        let cloned = {
            id: Number(user.userAccount.id),
            personID: Number(user.person.id),
            vaccinePatientID: Number(user.person.vaccine_patient_id)
        };

        req.login(cloned, function done() {
            res.send("true");
        });
    })(req, res, next);
});
app.post('/logout', function (req, res) {
    // Response as JSON file
    res.set({
        'Content-Type': 'application/json'
    });
    if (!req.user) {
        res.send("false");
        return;
    }
    req.logout();
    res.send("true");
});
app.post('/signin', function (req, res) {
    // Response as JSON file
    res.set({
        'Content-Type': 'application/json'
    });

    (async () => {
        try {
            // Signed in
            var signInResult = await signin({
                ...(req.body)
            });

            if (signInResult instanceof SigninError) {
                throw signInResult;
            }

            res.send("true");
        } catch (error) {
            res.send("false");
        }
    })().catch(() => {
        res.send("false");
    });
});
app.post('/certificate', function (req, res) {
    res.set({
        'Content-Type': 'application/json'
    });

    switch (req.body.action) {
        case 'view': {
            (async () => {
                let view = await viewCertifications(Number(req.user.personID));
                res.send(JSON.parse(view));
            })().catch(() => {
                res.send("null");
            });
            break;
        }
        case 'create': {
            (async () => {
                let create = await createCertification(
                    Number(req.user.personID),
                    Number(req.body.vaccineID),
                    req.body.data
                );
                res.send(String(create == 1));
            })().catch(() => {
                res.send("false");
            });
            break;
        }
        case 'edit': {
            (async () => {
                let edit = await editCertification(
                    Number(req.user.personID),
                    Number(req.body.certificationID),
                    req.body.data
                );
                res.send(String(edit == 1));
            })().catch(() => {
                res.send("false");
            });
            break;
        }
        default: {
            res.send("null");
        }
    }
});
app.post('/patient', function (req, res) {
    res.set({
        'Content-Type': 'application/json'
    });

    switch (req.body.action) {
        case 'view': {
            (async () => {
                let view = await viewPatient(
                    Number(req.user.vaccinePatientID)
                );
                delete view.id;
                res.send(JSON.parse(view));
            })().catch(() => {
                res.send("null");
            });
            break;
        }
        case 'create': {
            (async () => {
                let create = await createPatient(
                    req.body.data,
                    Number(req.user.personID)
                );
                res.send(String(create == 1));
            })().catch(() => {
                res.send("false");
            });
            break;
        }
        case 'edit': {
            (async () => {
                let edit = await editPatient(
                    Number(req.user.vaccinePatientID),
                    req.body.data
                );
                res.send(String(edit == 1));
            })().catch(() => {
                res.send("false");
            });
            break;
        }
        default: {
            res.send("null");
        }
    }
});
app.post('/records', function (req, res) {
    res.set({
        'Content-Type': 'application/json'
    });

    switch (req.body.action) {
        case 'view': {
            (async () => {
                let view = await viewRecords(
                    Number(req.user.personID)
                );
                res.send(JSON.parse(view));
            })().catch(() => {
                res.send("null");
            });

            break;
        }
        case 'create': {
            (async () => {
                let create = await createRecord(
                    Number(req.user.vaccinePatientID)
                );
                res.send(String(create == 1));
            })().catch(() => {
                res.send("false");
            });

            break;
        }
        case 'vaccinate': {
            (async () => {
                let vaccinate = await doVaccination(
                    req.body.data.vaccine,
                    Number(req.body.vaccineRecordID),
                    req.body.data.vaccineRecord
                );
                res.send(String(vaccinate == 1));
            })().catch(() => {
                res.send("false");
            })
            break;
        }
        default: {
            res.send("null");
        }
    }
});
app.post('/parenting', function (req, res) {
    res.set({
        'Content-Type': 'application/json'
    });

    switch (req.body) {
        case 'view': {
            (async () => {
                let view = await viewParenting(Number(req.user.personID));
                
                res.send(JSON.parse(view));
            })().catch(() => {
                res.send("null");
            })
            break;
        }
        case 'create': {
            (async () => {
                let create = await createParenting(
                    Number(req.user.personID),
                    Number(req.body.vaccinePatientID)
                );

                res.send(String(create == 1));
            })().catch(()=> {
                res.send("false")
            })
            break;
        }
        default: {
            res.send("null");
        }
    }
});
app.post('/', function (req, res) {
    res.set({
        'Content-Type': 'application/json'
    });
});
// Start web server
app.listen(port, function () {});