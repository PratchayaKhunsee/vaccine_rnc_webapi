/**
 * @typedef {import('express').RequestHandler} RequestHandler
 */

const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const {
    LoginError,
    SigninError,
    CertificateError,
    PatientError,
    RecordError,
    ParentingError
} = require('./error');
const {
    doQuery,
    connect
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
const {
    viewUser,
} = require('./query/user');

const port = process.env.PORT || 8080;
const httpStatus = {
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    OK: 200,
    CREATED: 201
};
const handlers = {
    /** @type {RequestHandler} */
    unauthorized(req, res, next) {
        res.set({
            'Content-Type': 'text/plain'
        });
        res.status(httpStatus.UNAUTHORIZED);
        res.send('UNAUTHORIZED');
    },
};
/**
 * 
 * @param {String} username 
 * @param {Date} generatedAt 
 */
const genJwt = function (username) {
    return jwt.sign({
        username,
        iat: new Date().getTime()
    }, process.env.JWT_TOKEN_SECRET);
};
/**
 * @type {import('express').RequestHandler}
 * @returns {Boolean}
 **/
const decodedJwt = function (req) {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    
    if(token == null){
        return null;
    }

    return jwt.verify(token, process.env.JWT_TOKEN_SECRET);
};
/**
 * 
 * @param {import('express').RequestHandler} [errorHandler] 
 */
const auth = function (errorHandler) {
    /**
     * @type {import('express').RequestHandler}
     **/
    function authenticate(req, res, next) {
        const verified = !!decodedJwt(req, res, next);

        if (verified) {
            next();
        } else {
            if (typeof errorHandler == 'function') errorHandler();
        }
    }

    return authenticate;
};

const method = {
    GET: {
        /** @type {import('express').RequestHandler} */
        user(req, res) {
            connect(async client => await viewUser(
                client,
                decodedJwt(req).username)
            ).then(result => {
                if (result === null) {
                    throw result;
                }

                res.status(httpStatus.OK);
                res.send(result);

            }).catch(error => {
                console.log(error);
                res.status(httpStatus.NOT_FOUND);
                res.send('Not found.')
            });
        }
    },
    POST: {
        /** @type {import('express').RequestHandler} */
        login(req, res, next) {
            res.set({
                'Content-Type': 'application/json'
            });

            let decoded = decodedJwt(req, res, next);

            if (decoded !== null) {
                res.status(httpStatus.OK);
                res.send({
                    verified: !!decoded
                });
                return;
            }

            const username = req.body.username;
            const password = req.body.password;

            connect(async client => await doLogIn(
                client,
                username,
                password
            )).then(queryResult => {
                if (queryResult instanceof LoginError) {
                    throw queryResult;
                }

                let jwt = genJwt(username, new Date());
                res.send({
                    jwt
                });
            }).catch(() => {
                res.status(httpStatus.NOT_FOUND);
                res.send(String(null));
            });
        },
        /** @type {import('express').RequestHandler} */
        signup(req, res, next) {
            // Response as JSON file
            res.set({
                'Content-Type': 'application/json'
            });

            connect(async client => await doSignUp(client, req.body))
                .then((queryResult) => {
                    if (queryResult instanceof SigninError) {
                        throw queryResult;
                    }

                    res.status(httpStatus.CREATED);
                    res.send(JSON.parse({
                        success: true,
                    }));
                }).catch(err => {
                    res.status(httpStatus.UNAUTHORIZED);
                    res.send(JSON.parse({
                        error: true,
                        cause: err
                    }));
                });
        },
    }
}

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Setting routing for accesing the app
app.get('/', function (req, res) {
    res.send('Welcome to the peaceful place');
});
app.post('/login', method.POST.login);
app.post('/signup', method.POST.signup);
app.get('/user', auth(handlers.unauthorized), method.GET.user);
app.post('/certificate', auth(handlers.unauthorized), function (req, res) {
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
            }, (err) => {
                console.log(err);
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
app.post('/patient', auth(handlers.unauthorized), function (req, res) {
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
app.post('/records', auth(handlers.unauthorized), function (req, res) {
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
app.post('/parenting', auth(handlers.unauthorized), function (req, res) {
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