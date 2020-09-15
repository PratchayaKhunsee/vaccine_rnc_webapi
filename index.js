const express = require('express');
const app = express();
const session = require('express-session');
const uuid = require('uuid').v4;
const bodyParser = require('body-parser');
const FileStore = require('session-file-store')(session);
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const {
    LoginError,
    SigninError,
    CertificateError,
    PatientError,
    RecordError,
    ParentingError
} = require('./error');
const {
    doQuery
} = require('./database');
const {
    doSignUp
} = require('./query/signup');
const {
    doLogIn
} = require('./query/login');
const {
    doViewRecords,
    doCreateRecord,
    doVaccination
} = require('./query/record');
const {
    doCreatePatient,
    doViewPatient,
    doEditPatient
} = require('./query/patient');
const {
    doViewCertifications,
    doCreateCertification,
    doEditCertification
} = require('./query/certificate');
const {
    doViewParenting,
    doCreateParenting
} = require('./query/parenting');

let port = process.env.PORT || 8080;

// Configure passport.js to use the local strategy
passport.use(new LocalStrategy({
    usernameField: 'username',
    passwordField: 'password'
},
    function (username, password, done) {
        doQuery(async (q) => {
            let result = await doLogIn(q, username, password);
            if (result instanceof LoginError) {
                throw result;
            }
            done(null, result);
        }, (err) => {
            done(err);
        });
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
    res.send('Welcome to the peaceful place!!');
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
    passport.authenticate('local', function (err, allowed) {
        if (err) {
            res.send("false");
            return;
        }

        let savedUser = {
            username: allowed.userAccount.username,
            id: Number(allowed.userAccount.username)
        };
        let sessionSaved = {
            personID: Number(allowed.person.id),
            vaccinePatientID: Number(allowed.person.vaccine_patient_id)
        };

        req.session.userInfo = sessionSaved;

        req.login(savedUser, function done() {
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
app.post('/signup', function (req, res) {
    // Response as JSON file
    res.set({
        'Content-Type': 'application/json'
    });

    console.log(req.body);

    doQuery(async (q) => {
        let queryResult = await doSignUp(q, req.body);
        if (queryResult instanceof SigninError) {
            throw queryResult;
        }
        res.send("true");
    }, (err) => {
        res.status(400);
        console.log(err);
        res.send("false");
    });
});
app.post('/certificate', function (req, res) {
    res.set({
        'Content-Type': 'application/json'
    });

    switch (req.body.action) {
        case 'view': {
            doQuery(async (q) => {
                let view = await doViewCertifications(
                    q,
                    Number(req.session.userInfo.personID)
                );

                if (view instanceof CertificateError) {
                    throw view;
                }

                res.send(JSON.parse(view));
            }, () => {
                res.send("null");
            });
            break;
        }
        case 'create': {
            doQuery(async (q) => {
                let create = await doCreateCertification(
                    q,
                    Number(req.session.userInfo.personID),
                    Number(req.body.vaccineID),
                    req.body.data
                );

                if (create instanceof CertificateError) {
                    throw create;
                }

                res.send(String(create == 1));
            }, () => {
                res.send("false");
            });
            break;
        }
        case 'edit': {
            doQuery(async (q) => {
                let edit = await doEditCertification(
                    q,
                    Number(req.session.userInfo.personID),
                    Number(req.body.certificationID),
                    req.body.data
                );

                if (edit instanceof CertificateError) {
                    throw edit;
                }

                res.send(String(edit == 1));
            }, () => {
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
            doQuery(async (q) => {
                let view = await doViewPatient(
                    q,
                    Number(req.session.userInfo.vaccinePatientID)
                );
                delete view.id;

                if (view instanceof PatientError) {
                    throw view;
                }

                res.send(JSON.parse(view));
            }, () => {
                res.send("null");
            });
            break;
        }
        case 'create': {
            doQuery(async (q) => {
                let create = await doCreatePatient(
                    q,
                    req.body.data,
                    Number(req.session.userInfo.personID)
                );

                if (create instanceof PatientError) {
                    throw create;
                }

                res.send(String(create == 1));
            }, () => {
                res.send("false");
            });
            break;
        }
        case 'edit': {
            doQuery(async (q) => {
                let edit = await doEditPatient(
                    q,
                    Number(req.session.userInfo.vaccinePatientID),
                    req.body.data
                );

                if (edit instanceof PatientError) {
                    throw edit;
                }

                res.send(String(edit == 1));
            }, () => {
                res.send("null");
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
            doQuery(async (q) => {
                let view = await doViewRecords(
                    q,
                    Number(req.session.userInfo.personID)
                );

                if (view instanceof RecordError) {
                    throw view;
                }

                res.send(JSON.parse(view));
            }, () => {
                res.send("null");
            });

            break;
        }
        case 'create': {
            doQuery(async (q) => {
                let create = await doCreateRecord(
                    q,
                    Number(req.session.userInfo.vaccinePatientID)
                );

                if (create instanceof RecordError) {
                    throw create;
                }

                res.send(String(create == 1));
            }, () => {
                res.send("false")
            });

            break;
        }
        case 'vaccinate': {
            doQuery(async (q) => {
                let vaccinate = await doVaccination(
                    q,
                    req.body.data.vaccine,
                    Number(req.body.vaccineRecordID),
                    req.body.data.vaccineRecord
                );

                if (vaccinate instanceof RecordError) {
                    throw vaccinate;
                }

                res.send(String(vaccinate == 1));
            }, () => {
                res.send("false");
            });
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
            doQuery(async (q) => {
                let view = await doViewParenting(
                    q,
                    Number(req.session.userInfo.personID)
                );

                if (view instanceof ParentingError) {
                    throw view;
                }

                res.send(JSON.parse(view));
            }, () => {
                res.send("null");
            });
            break;
        }
        case 'create': {
            doQuery(async (q) => {
                let create = await doCreateParenting(
                    q,
                    Number(req.session.userInfo.personID),
                    Number(req.body.vaccinePatientID)
                );

                if (create instanceof ParentingError) {
                    throw create;
                }

                res.send(String(create == 1));
            }, () => {
                res.send("false");
            });
            break;
        }
        default: {
            res.send("null");
        }
    }
});
app.post('/', function (req, res) {
    res.send('null');
});
// Start web server
app.listen(port, function () { });