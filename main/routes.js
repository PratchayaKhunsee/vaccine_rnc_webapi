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
    editUserInfo,
    editUserAccount
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
        'user/view'(req, res, next) {
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
        'patient/view': function (req, res, next) {
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
            res.contentType('application/vnd.android.package-archive');
            res.download(path.dirname(require.main.filename) + '/assets/vaccine-records-n-certs.apk');
        }
    },
    POST: {
        /** @type {RequestHandler} */
        'login'(req, res, next) {
            /** Login authentication token.  */
            let decoded = Token.decode(req, res, next);

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

            console.log(req.body)


            if (!(username && password)) {
                response.badRequest(req, res, next);
                return;
            }

            console.log('do logging in')

            connect(async client => await logIn(
                client,
                username,
                password
            )).then(result => {
                console.log(result);
                if (result instanceof ErrorWithCode) {
                    throw result;
                }

                let token = Token.generate(username, new Date());
                response.ok(req, res, next, { token });

                console.log('good.')
            }).catch(
                /**
                 * @param {ErrorWithCode} error
                 */
                error => {
                    console.log(error)
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
                        console.log(err);
                        //
                        response.badRequest(req, res, next, err);
                    }
                );
        },
        /** @type {RequestHandler} */
        'user/info/edit'(req, res, next) {
            const decoded = Token.decode(req, res, next);
            connect(async client => await editUserInfo(
                client,
                decoded.username,
                req.body
            )).then(result => {
                if (result instanceof ErrorWithCode) throw result;

                response.ok(req, res, next, result);
            }).catch(
                /** @param {ErrorWithCode} error */
                error => {
                    console.log(error);
                    response.badRequest(req, res, next, error);
                }
            );
        },
        /** @type {RequestHandler} */
        'user/account/edit'(req, res, next){
            const decoded = Token.decode(req, res, next);
            connect(async client => await editUserAccount(
                client,
                decoded.username,
                req.body
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
        'record/view'(req, res, next) {
            let decoded = Token.decode(req, res, next);

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
                    response.noContent(req, res, next, error);
                }
            );
        },
        /** @type {RequestHandler} */
        'record/create'(req, res, next) {
            let decoded = Token.decode(req, res, next);

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
        'record/edit'(req, res, next) {
            let decoded = Token.decode(req, res, next);

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
        'patient/create'(req, res, next) {
            let decoded = Token.decode(req, res, next);

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
        'patient/create/self'(req, res, next) {
            let decoded = Token.decode(req, res, next);

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
        'patient/edit'(req, res, next) {
            let decoded = Token.decode(req, res, next);

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
            let decoded = Token.decode(req, res, next);

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
            let decoded = Token.decode(req, res, next);

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
            let decoded = Token.decode(req, res, next);

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
            let decoded = Token.decode(req, res, next);
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
            let decoded = Token.decode(req, res, next);

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
            let decoded = Token.decode(req, res, next);

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
            let decoded = Token.decode(req, res, next);

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
            let decoded = Token.decode(req, res, next);

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
            let decoded = Token.decode(req, res, next);
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
    app.get('/patient/view', createAuthenticateCallback(response.unauthorized), METHOD.GET['patient/view']);
    app.get('/user/view',createAuthenticateCallback(response.unauthorized), METHOD.GET['user/view']);
    app.post('/login', METHOD.POST.login);
    app.post('/signup', METHOD.POST.signup);

    for (let url of [
        'user/info/edit',
        'user/account/edit',
        'record/view',
        'record/create',
        'record/edit',
        'patient/create',
        'patient/create/self',
        'patient/edit',
        'patient/remove',
        'certificate/view',
        'certificate/available',
        'certificate/create',
        'certificate/list',
        'certificate/edit',
        'certificate/list/full',
        'certificate/view/header',
        'certificate/edit/header'
    ]) {
        app.post('/' + url, createAuthenticateCallback(response.unauthorized), METHOD.POST[url]);
    }
    app.post('/', function (req, res) {
        res.send('Did you feel empty inside of your body?');
    });
}

module.exports = routes;