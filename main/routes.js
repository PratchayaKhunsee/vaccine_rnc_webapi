const app = require('./app');
const response = require('./response');
const jwt = require('jsonwebtoken');
const path = require('path');

/**
 * @typedef {import('express').RequestHandler} RequestHandler
 */


const {
    ERRORS,
    ErrorWithCode
} = require('../error');

// =============== Import The Database Connection Function =============== // 
const {
    connect
} = require('../database');

// =============== Import All Querying Functions =============== // 
const {
    signUp
} = require('../query/signup');
const {
    logIn
} = require('../query/login');
const {
    viewRecord,
    createRecord,
    editRecord
} = require('../query/records');
const {
    getAvailablePatients,
    createPatientForSelf,
    createPatientAsChild,
    editPatient,
    removePatient
} = require('../query/patient');
const {
    getAvailableVaccination,
    createCertification,
    getBrieflyCertificates,
    editCertificate,
    viewCertificate,
    getFullCertificates,
    editCertificateHeader,
    viewCertificateHeader
} = require('../query/certificate');
const {
    viewUser,
    editUser
} = require('../query/user');

/**
 * JSON Web Token useful object.
 */
const Token = {
    /**
     * Generates authorization token.
     * 
     * @param {String} username 
     * @param {Date} generatedAt 
     */
    generate: (username) => jwt.sign({
        username,
        iat: new Date().getTime()
    }, process.env.JWT_TOKEN_SECRET),
    /**
     * Decode the request's authorization token.
     * 
     * @type {RequestHandler}
     * @returns {Boolean}
     **/
    decode: function (req) {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1];

        if (token == null) {
            return null;
        }

        return jwt.verify(token, process.env.JWT_TOKEN_SECRET);
    }
};

/**
 * The authentication callback creating function
 * @param {RequestHandler} errorCallback 
 */
const createAuthenticateCallback = (errorCallback) =>
    /**
     * 
     * @type {RequestHandler}
     */
    function authenticate(req, res, next) {
        if (!!Token.decode(req, res, next)) next();
        else if (typeof errorCallback == 'function') errorCallback(req, res, next);
    };

/**
 * The response handlers that depend on the request context.
 */
const METHOD = {
    GET: {
        /** @type {RequestHandler} */
        'user'(req, res, next) {
            let decoded = Token.decode(req, res, next);
            connect(async client => await viewUser(
                client,
                decoded ? decoded.username : ''
            )).then(result => {
                if (result instanceof ErrorWithCode) {
                    throw result;
                }

                response.ok(req, res, next, result);
            }).catch(
                /** @param {ErrorWithCode} error */
                error => {
                    response.contentNotFound(req, res, next, error);
                }
            );
        },
        /** @type {RequestHandler} */
        'records/available/patient': function (req, res, next) {
            let decoded = Token.decode(req, res, next);

            connect(async client => await getAvailablePatients(
                client, decoded ? decoded.username : ''
            )).then(result => {
                if (result instanceof ErrorWithCode) throw result;

                response.ok(req, res, next, result);
            }).catch(
                /** @param {ErrorWithCode} error */
                error => {
                    response.contentNotFound(req, res, next, error);
                }
            );
        },
        /** @type {RequestHandler} */
        'download/android': function (req, res, next) {
            res.download(path.dirname(require.main.filename) + '/assets/vaccine-records-n-certs.apk');
        }
    },
    POST: {
        /** @type {RequestHandler} */
        'login'(req, res, next) {
            /** Login authentication token.  */
            let decoded = decode_auth_token(req, res, next);

            // For validate token authentication.
            if (decoded !== null) {
                response.ok(req, res, next, {
                    verified: !!decoded,
                });
                return;
            }

            /** @type {String} */
            const username = req.body.username;
            /** @type {String} */
            const password = req.body.password;

            if (!(username && password)) {
                response.badRequest(req, res, next);
            }

            connect(async client => await logIn(
                client,
                username,
                password
            )).then(result => {
                if (result instanceof ErrorWithCode) {
                    throw result;
                }

                let token = generate_auth_token(username, new Date());
                response.ok(req, res, next, { token });
            }).catch(
                /**
                 * @param {ErrorWithCode} error
                 */
                error => {
                    response.badRequest(req, res, next, error);
                }
            );
        },
        /** @type {RequestHandler} */
        'signup'(req, res, next) {
            connect(async client => await signUp(client, req.body))
                .then((result) => {
                    if (result instanceof ErrorWithCode) {
                        throw result;
                    }

                    response.created(req, res, next, true);
                }).catch(
                    /** @param {ErrorWithCode} err */
                    err => {
                        response.badRequest(req, res, next, err);
                    }
                );
        },
        /** @type {RequestHandler} */
        'patient/create/self'(req, res, next) {
            let decoded = decode_auth_token(req, res, next);

            connect(async client => await createPatientForSelf(
                client,
                decoded ? decoded.username : '',
                req.body
            )).then((result) => {
                if (result instanceof ErrorWithCode) throw result;
                response.created(req, res, next, result);
            }).catch(
                /** @param {ErrorWithCode} error */
                error => {
                    response.badRequest(req, res, next, error);
                }
            );
        },
        /** @type {RequestHandler} */
        'record/view'(req, res, next) {
            let decoded = decode_auth_token(req, res, next);

            connect(async client => await viewRecord(
                client,
                decoded ? decoded.username : '',
                req.body.patient_id
            )).then((result) => {
                if (result instanceof ErrorWithCode) throw result;

                response.ok(req, res, next, result);
            }).catch(
                /** @param {ErrorWithCode} error */
                error => {
                    response.contentNotFound(req, res, next, error);
                }
            );
        },
        /** @type {RequestHandler} */
        'record/create'(req, res, next) {
            let decoded = decode_auth_token(req, res, next);

            connect(async client => await createRecord(
                client,
                decoded ? decoded.username : '',
                req.body.patient_id
            )).then((result) => {
                if (result instanceof ErrorWithCode) throw result;

                response.created(req, res, next, result);
            }).catch(
                /** @param {ErrorWithCode} error */
                error => {
                    response.badRequest(req, res, next, error);
                }
            );
        },
        /** @type {RequestHandler} */
        'patient/create'(req, res, next) {
            let decoded = decode_auth_token(req, res, next);

            connect(async client => await createPatientAsChild(
                client,
                decoded ? decoded.username : '',
                req.body
            )).then((result) => {
                if (result instanceof ErrorWithCode) throw result;

                response.created(req, res, next, result);
            }).catch(
                /** @param {ErrorWithCode} error */
                error => {
                    response.badRequest(req, res, next, error);
                }
            );
        },
        /** @type {RequestHandler} */
        user(req, res, next) {
            const decoded = decode_auth_token(req, res, next);
            connect(async client => await editUser(
                client,
                decoded.username,
                req.body.person || null,
                req.body.password || null
            )).then(result => {
                if (result instanceof ErrorWithCode) throw result;

                response.ok(req, res, next, result);
            }).catch(
                /** @param {ErrorWithCode} error */
                error => {
                    response.badRequest(req, res, next, error);
                }
            );
        },
        /** @type {RequestHandler} */
        'record/edit'(req, res, next) {
            let decoded = decode_auth_token(req, res, next);

            connect(async client => await editRecord(
                client,
                decoded ? decoded.username : '',
                req.body
            )).then((result) => {
                if (result instanceof ErrorWithCode) throw result;

                response.ok(req, res, next, result);
            }).catch(
                /** @param {ErrorWithCode} error */
                error => {
                    response.badRequest(req, res, next, error);
                }
            );
        },
        /** @type {RequestHandler} */
        'patient/edit'(req, res, next) {
            let decoded = decode_auth_token(req, res, next);

            connect(async client => await editPatient(
                client,
                decoded ? decoded.username : '',
                req.body
            )).then((result) => {
                if (result instanceof ErrorWithCode) throw result;

                response.ok(req, res, next, result);
            }).catch(
                /** @param {ErrorWithCode} error */
                error => {
                    response.badRequest(req, res, next, error);
                }
            );
        },
        /** @type {RequestHandler} */
        'patient/remove'(req, res, next) {
            let decoded = decode_auth_token(req, res, next);

            connect(async client => await removePatient(
                client,
                decoded ? decoded.username : '',
                req.body.patient_id
            )).then((result) => {
                if (result instanceof ErrorWithCode) throw result;

                response.ok(req, res, next, true);
            }).catch(
                /** @param {ErrorWithCode} error */
                error => {
                    response.badRequest(req, res, next, error);
                }
            );
        },
        /** @type {RequestHandler} */
        'certificate/view'(req, res, next) {
            let decoded = decode_auth_token(req, res, next);

            connect(async client => await viewCertificate(
                client,
                decoded ? decoded.username : '',
                req.body,
            )).then((result) => {
                if (result instanceof ErrorWithCode) throw result;
                response.ok(req, res, next, result);
            }).catch(
                /** @param {ErrorWithCode} error */
                error => {
                    response.badRequest(req, res, next, error);
                }
            );
        },
        /** @type {RequestHandler} */
        'certificate/available'(req, res, next) {
            let decoded = decode_auth_token(req, res, next);

            connect(async client => await getAvailableVaccination(
                client,
                decoded ? decoded.username : '',
                req.body.patient_id
            )).then((result) => {
                // console.log(result);
                if (result instanceof ErrorWithCode) throw result;

                response.ok(req, res, next, result);
            }).catch(
                /** @param {ErrorWithCode} error */
                error => {
                    response.badRequest(req, res, next, error);
                }
            );
        },
        /** @type {RequestHandler} */
        'certificate/create'(req, res, next) {
            let decoded = decode_auth_token(req, res, next);
            connect(async client => await createCertification(
                client,
                decoded ? decoded.username : '',
                req.body
            )).then((result) => {
                if (result instanceof ErrorWithCode) throw result;

                response.ok(req, res, next, result);
            }).catch(
                /** @param {ErrorWithCode} error */
                error => {
                    response.badRequest(req, res, next, error);
                }
            );
        },
        /** @type {RequestHandler} */
        'certificate/list'(req, res, next) {
            let decoded = decode_auth_token(req, res, next);

            connect(async client => await getBrieflyCertificates(
                client,
                decoded ? decoded.username : '',
                req.body.patient_id
            )).then((result) => {
                if (result instanceof ErrorWithCode) throw result;

                response.ok(req, res, next, result);
            }).catch(
                /** @param {ErrorWithCode} error */
                error => {
                    response.badRequest(req, res, next, error);
                }
            );
        },
        /** @type {RequestHandler} */
        'certificate/edit'(req, res, next) {
            let decoded = decode_auth_token(req, res, next);

            connect(async client => await editCertificate(
                client,
                decoded ? decoded.username : '',
                req.body
            )).then((result) => {
                if (result instanceof ErrorWithCode) throw result;

                response.ok(req, res, next, result);
            }).catch(
                /** @param {ErrorWithCode} error */
                error => {
                    response.badRequest(req, res, next, error);
                }
            );
        },
        /** @type {RequestHandler} */
        'certificate/list/full'(req, res, next) {
            let decoded = decode_auth_token(req, res, next);

            connect(async client => await getFullCertificates(
                client,
                decoded ? decoded.username : '',
                req.body
            )).then((result) => {
                if (result instanceof ErrorWithCode) throw result;

                response.ok(req, res, next, result);
            }).catch(
                /** @param {ErrorWithCode} error */
                error => {
                    response.badRequest(req, res, next, error);
                }
            );
        },
        /** @type {RequestHandler} */
        'certificate/edit/header'(req, res, next) {
            let decoded = decode_auth_token(req, res, next);

            connect(async client => await editCertificateHeader(
                client,
                decoded ? decoded.username : '',
                req.body
            )).then((result) => {
                if (result instanceof ErrorWithCode) throw result;

                response.ok(req, res, next, result);
            }).catch(
                /** @param {ErrorWithCode} error */
                error => {
                    response.badRequest(req, res, next, error);
                }
            );
        },
        /** @type {RequestHandler} */
        'certificate/view/header'(req, res, next) {
            let decoded = decode_auth_token(req, res, next);
            connect(async client => await viewCertificateHeader(
                client,
                decoded ? decoded.username : '',
                req.body.patient_id
            )).then((result) => {
                if (result instanceof ErrorWithCode) throw result;
                console.log(result);
                response.ok(req, res, next, result);
            }).catch(
                /** @param {ErrorWithCode} error */
                error => {
                    response.badRequest(req, res, next, error);
                }
            );
        },
    }
};

function routes() {
    app.get('/', function (req, res) {
        res.render('index.ejs', { title: 'Records and Certification of Vaccination' });
    });
    app.get('/download/android', METHOD.GET['download/android']);
    app.post('/login', METHOD.POST.login);
    app.post('/signup', METHOD.POST.signup);
    app.get('/user', createAuthenticateCallback(response.unauthorized), METHOD.GET.user);
    app.get('/records/available/patient', createAuthenticateCallback(response.unauthorized), METHOD.GET['records/available/patient']);
    // app.post('/user', createAuthenticateCallback(response.unauthorized), METHOD.POST.user);
    // app.post('/patient/create/self', createAuthenticateCallback(response.unauthorized), METHOD.POST['patient/create/self']);
    // app.post('/record/view', createAuthenticateCallback(response.unauthorized), METHOD.POST['record/view']);
    // app.post('/record/create', createAuthenticateCallback(response.unauthorized), METHOD.POST['record/create']);
    // app.post('/record/edit', createAuthenticateCallback(response.unauthorized), METHOD.POST['record/edit']);
    // app.post('/patient/create', createAuthenticateCallback(response.unauthorized), METHOD.POST['patient/create']);
    // app.post('/patient/edit', createAuthenticateCallback(response.unauthorized), METHOD.POST['patient/edit']);
    // app.post('/patient/remove', createAuthenticateCallback(response.unauthorized), METHOD.POST['patient/remove']);
    // app.post('/certificate/view', createAuthenticateCallback(response.unauthorized), METHOD.POST['certificate/view']);
    // app.post('/certificate/available', createAuthenticateCallback(response.unauthorized), METHOD.POST['certificate/available']);
    // app.post('/certificate/create', createAuthenticateCallback(response.unauthorized), METHOD.POST['certificate/create']);
    // app.post('/certificate/list', createAuthenticateCallback(response.unauthorized), METHOD.POST['certificate/list']);
    // app.post('/certificate/edit', createAuthenticateCallback(response.unauthorized), METHOD.POST['certificate/edit']);
    // app.post('/certificate/list/full', createAuthenticateCallback(response.unauthorized), METHOD.POST['certificate/list/full']);
    // app.post('/certificate/view/header', createAuthenticateCallback(response.unauthorized), METHOD.POST['certificate/view/header']);
    // app.post('/certificate/edit/header', createAuthenticateCallback(response.unauthorized), METHOD.POST['certificate/edit/header']);
    for(let url of [
        'user',
        'patient/create/self',
        'record/view',
        'record/create',
        'record/edit',
        'patient/remove',
        'certificate/view',
        'certificate/available',
        'certificate/create',
        'certificate/list',
        'certificate/edit',
        'certificate/list/full',
        'certificate/view/header',
        'certificate/edit/header'
    ]){
        app.post('/'+ url, createAuthenticateCallback(response.unauthorized), METHOD.POST[url]);
    }
    app.post('/', function (req, res) {
        res.send('Did you feel empty inside of your body?');
    });
}

module.exports = routes;