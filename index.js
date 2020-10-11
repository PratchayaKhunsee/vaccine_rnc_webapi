/**
 * @typedef {import('express').RequestHandler} RequestHandler
 */
/** @namespace */

// ============ Imported modules =============== //
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
    ParentingError,
    ERRORS,
    ErrorWithCode
} = require('./error');
const {
    doQuery,
    connect
} = require('./database');
const {
    signUp
} = require('./query/signup');
const {
    logIn
} = require('./query/login');
const {
    doViewRecords,
    doCreateRecord,
    doVaccination,
    viewRecord,
    createRecord,
    editRecord
} = require('./query/records');
const {
    doCreatePatient,
    doViewPatient,
    doEditPatient,
    getAvailablePatients,
    createPatientForSelf,
    createPatientAsChild,
    editPatient,
    removePatient
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
    editUser
} = require('./query/user');

// ============ Constants Vars ================= //
const port = process.env.PORT || 8080;
const httpStatus = {
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    OK: 200,
    CREATED: 201
};

// =========== Callback Handlers ============= //
const responseHandler = {
    /**
     * Response to the request with [UNAUTHORIZED] HTTP status code.
     * @type {RequestHandler}
     * @param {String} [content]
     * @returns {void}
     **/
    unauthorized(req, res, next, content) {
        res.set({
            'Content-Type': 'application/json'
        });
        res.status(httpStatus.UNAUTHORIZED);
        res.send(JSON.stringify(content) || '{}');
    },
    /**
     * Response to the request with [NOT_FOUND] HTTP status code.
     * @type {RequestHandler}
     * @param {String} [content]
     * @returns {void}
     **/
    contentNotFound(req, res, next, content) {
        res.set({
            'Content-Type': 'application/json'
        });
        console.log(content, JSON.stringify(content));
        res.status(httpStatus.NOT_FOUND);
        res.send(JSON.stringify(content) || '{}');
    },
    /**
     * Response to the request with [OK] HTTP status code.
     * @type {RequestHandler}
     * @param {String} [content]
     * @returns {void}
     **/
    ok(req, res, next, content) {
        res.set({
            'Content-Type': 'application/json'
        });
        res.status(httpStatus.OK);
        res.send(JSON.stringify(content) || '{}');
    },
    /**
     * Response to the request with [CREATED] HTTP status code.
     * @type {RequestHandler}
     * @param {String} [content]
     * @returns {void}
     **/
    created(req, res, next, content) {
        res.set({
            'Content-Type': 'application/json'
        });
        res.status(httpStatus.CREATED);
        res.send(JSON.stringify(content) || '{}');
    },
    /**
     * Response to the request with [BAD_REQUEST] HTTP status code.
     * @type {RequestHandler}
     * @param {String} [content]
     * @returns {void}
     **/
    badRequest(req, res, next, content) {
        res.set({
            'Content-Type': 'application/json'
        });
        res.status(httpStatus.BAD_REQUEST);
        res.send(JSON.stringify(content) || '{}');
    }
};

// ============= Useful Functions ============= //

/**
 * Generates authorization token.
 * 
 * @param {String} username 
 * @param {Date} generatedAt 
 */
const generate_auth_token = function (username) {
    return jwt.sign({
        username,
        iat: new Date().getTime()
    }, process.env.JWT_TOKEN_SECRET);
};

/**
 * Decode the request's authorization token.
 * 
 * @type {import('express').RequestHandler}
 * @returns {Boolean}
 **/
const decode_auth_token = function (req) {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) {
        return null;
    }

    return jwt.verify(token, process.env.JWT_TOKEN_SECRET);
};

// =========== Custom Middleware ============= //

/**
 * Authentiaction handler.
 * 
 * @param {import('express').RequestHandler} [errorHandler] 
 */
const auth = function (errorHandler) {
    /**
     * @type {import('express').RequestHandler}
     **/
    function authenticate(req, res, next) {
        const verified = !!decode_auth_token(req, res, next);

        if (verified) {
            next();
        } else {
            if (typeof errorHandler == 'function') errorHandler();
        }
    }

    return authenticate;
};

// ====== Request/Response Callback Handler ====== //

/**
 * Callback responseHandler for responding the requests.
 */
const method = {
    GET: {
        /** @type {import('express').RequestHandler} */
        user(req, res, next) {
            let decoded = decode_auth_token(req, res, next);
            connect(async client => await viewUser(
                client,
                decoded ? decoded.username : ''
            )).then(result => {
                if (result instanceof ErrorWithCode) {
                    throw result;
                }

                responseHandler.ok(req, res, next, result);
            }).catch(
                /** @param {ErrorWithCode} error */
                error => {
                    responseHandler.contentNotFound(req, res, next, error);
                }
            );
        },
        /** @type {import('express').RequestHandler} */
        'records/available/patient': function (req, res, next) {
            let decoded = decode_auth_token(req, res, next);

            connect(async client => await getAvailablePatients(
                client, decoded ? decoded.username : ''
            )).then(result => {
                if (result instanceof ErrorWithCode) throw result;

                responseHandler.ok(req, res, next, result);
            }).catch(
                /** @param {ErrorWithCode} error */
                error => {
                    responseHandler.contentNotFound(req, res, next, error);
                }
            );
        }
    },
    POST: {
        /** @type {import('express').RequestHandler} */
        login(req, res, next) {
            /** Login authentication token.  */
            let decoded = decode_auth_token(req, res, next);

            // For validate token authentication.
            if (decoded !== null) {
                responseHandler.ok(req, res, next, {
                    verified: !!decoded,
                });
                return;
            }

            /** @type {String} */
            const username = req.body.username;
            /** @type {String} */
            const password = req.body.password;

            if (!(username && password)) {
                responseHandler.badRequest(req, res, next);
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
                responseHandler.ok(req, res, next, { token });
            }).catch(
                /**
                 * @param {ErrorWithCode} error
                 */
                error => {
                    responseHandler.badRequest(req, res, next, error);
                }
            );
        },
        /** @type {import('express').RequestHandler} */
        signup(req, res, next) {
            connect(async client => await signUp(client, req.body))
                .then((result) => {
                    if (result instanceof ErrorWithCode) {
                        throw result;
                    }

                    responseHandler.created(req, res, next, true);
                }).catch(
                    /** @param {ErrorWithCode} err */
                    err => {
                        responseHandler.badRequest(req, res, next, err);
                    }
                );
        },
        /** @type {import('express').RequestHandler} */
        'patient/create/self'(req, res, next) {
            let decoded = decode_auth_token(req, res, next);

            connect(async client => await createPatientForSelf(
                client,
                decoded ? decoded.username : '',
                req.body
            )).then((result) => {
                if (result instanceof ErrorWithCode) throw result;
                responseHandler.created(req, res, next, result);
            }).catch(
                /** @param {ErrorWithCode} error */
                error => {
                    responseHandler.badRequest(req, res, next, error);
                }
            );
        },
        /** @type {import('express').RequestHandler} */
        'record/view'(req, res, next) {
            let decoded = decode_auth_token(req, res, next);

            connect(async client => await viewRecord(
                client,
                decoded ? decoded.username : '',
                req.body.patient_id
            )).then((result) => {
                if (result instanceof ErrorWithCode) throw result;

                responseHandler.ok(req, res, next, result);
            }).catch(
                /** @param {ErrorWithCode} error */
                error => {
                    responseHandler.contentNotFound(req, res, next, error);
                }
            );
        },
        /** @type {import('express').RequestHandler} */
        'record/create'(req, res, next) {
            let decoded = decode_auth_token(req, res, next);

            connect(async client => await createRecord(
                client,
                decoded ? decoded.username : '',
                req.body.patient_id
            )).then((result) => {
                if (result instanceof ErrorWithCode) throw result;

                responseHandler.created(req, res, next, result);
            }).catch(
                /** @param {ErrorWithCode} error */
                error => {
                    responseHandler.badRequest(req, res, next, error);
                }
            );
        },
        /** @type {import('express').RequestHandler} */
        'patient/create'(req, res, next) {
            let decoded = decode_auth_token(req, res, next);

            connect(async client => await createPatientAsChild(
                client,
                decoded ? decoded.username : '',
                req.body
            )).then((result) => {
                if (result instanceof ErrorWithCode) throw result;

                responseHandler.created(req, res, next, result);
            }).catch(
                /** @param {ErrorWithCode} error */
                error => {
                    responseHandler.badRequest(req, res, next, error);
                }
            );
        },
        /** @type {import('express').RequestHandler} */
        user(req, res, next) {
            const decoded = decode_auth_token(req, res, next);
            connect(async client => await editUser(
                client,
                decoded.username,
                req.body.person || null,
                req.body.password || null
            )).then(result => {
                if (result instanceof ErrorWithCode) throw result;

                responseHandler.ok(req, res, next, result);
            }).catch(
                /** @param {ErrorWithCode} error */
                error => {
                    responseHandler.badRequest(req, res, next, error);
                }
            );
        },
        /** @type {import('express').RequestHandler} */
        'record/edit'(req, res, next) {
            let decoded = decode_auth_token(req, res, next);

            connect(async client => await editRecord(
                client,
                decoded ? decoded.username : '',
                req.body
            )).then((result) => {
                if (result instanceof ErrorWithCode) throw result;

                responseHandler.ok(req, res, next, result);
            }).catch(
                /** @param {ErrorWithCode} error */
                error => {
                    responseHandler.badRequest(req, res, next, error);
                }
            );
        },
         /** @type {import('express').RequestHandler} */
        'patient/edit'(req,res,next){
            let decoded = decode_auth_token(req, res, next);

            connect(async client => await editPatient(
                client,
                decoded ? decoded.username : '',
                req.body
            )).then((result) => {
                if (result instanceof ErrorWithCode) throw result;

                responseHandler.ok(req, res, next, result);
            }).catch(
                /** @param {ErrorWithCode} error */
                error => {
                    responseHandler.badRequest(req, res, next, error);
                }
            );
        }
    },
    // PATCH: {
    //     /** @type {import('express').RequestHandler} */
    //     user(req, res, next) {
    //         const decoded = decode_auth_token(req, res, next);
    //         connect(async client => await editUser(
    //             client,
    //             decoded.username,
    //             req.body.person || null,
    //             req.body.password || null
    //         )).then(result => {
    //             if (result instanceof ErrorWithCode) throw result;

    //             responseHandler.ok(req, res, next, result);
    //         }).catch(
    //             /** @param {ErrorWithCode} error */
    //             error => {
    //                 responseHandler.badRequest(req, res, next, error);
    //             }
    //         );
    //     },
    //     /** @type {import('express').RequestHandler} */
    //     'record/edit'(req, res, next) {
    //         let decoded = decode_auth_token(req, res, next);

    //         connect(async client => await editRecord(
    //             client,
    //             decoded ? decoded.username : '',
    //             req.body
    //         )).then((result) => {
    //             if (result instanceof ErrorWithCode) throw result;

    //             responseHandler.ok(req, res, next, result);
    //         }).catch(
    //             /** @param {ErrorWithCode} error */
    //             error => {
    //                 responseHandler.badRequest(req, res, next, error);
    //             }
    //         );
    //     },
    //      /** @type {import('express').RequestHandler} */
    //     'patient/edit'(req,res,next){
    //         let decoded = decode_auth_token(req, res, next);

    //         connect(async client => await editPatient(
    //             client,
    //             decoded ? decoded.username : '',
    //             req.body
    //         )).then((result) => {
    //             if (result instanceof ErrorWithCode) throw result;

    //             responseHandler.ok(req, res, next, result);
    //         }).catch(
    //             /** @param {ErrorWithCode} error */
    //             error => {
    //                 responseHandler.badRequest(req, res, next, error);
    //             }
    //         );
    //     },
    //     /** @type {import('express').RequestHandler} */
    //     'patient/remove'(req,res,next){
    //         let decoded = decode_auth_token(req, res, next);

    //         connect(async client => await removePatient(
    //             client,
    //             decoded ? decoded.username : '',
    //             req.body.patient_id
    //         )).then((result) => {
    //             if (result instanceof ErrorWithCode) throw result;

    //             responseHandler.ok(req, res, next, true);
    //         }).catch(
    //             /** @param {ErrorWithCode} error */
    //             error => {
    //                 responseHandler.badRequest(req, res, next, error);
    //             }
    //         );
    //     },
    // },
    // DELETE: {
    //     /** @type {import('express').RequestHandler} */
    //     'patient/remove'(req,res,next){
    //         let decoded = decode_auth_token(req, res, next);

    //         connect(async client => await removePatient(
    //             client,
    //             decoded ? decoded.username : '',
    //             req.body.patient_id
    //         )).then((result) => {
    //             if (result instanceof ErrorWithCode) throw result;

    //             responseHandler.ok(req, res, next, true);
    //         }).catch(
    //             /** @param {ErrorWithCode} error */
    //             error => {
    //                 responseHandler.badRequest(req, res, next, error);
    //             }
    //         );
    //     }
    // }
}

// ============= Middleware Usage ============== //
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// ============= REST API Routing ============== //
app.get('/', function (req, res) {
    res.send('Welcome to the peaceful place');
});
app.post('/login', method.POST.login);
app.post('/signup', method.POST.signup);
app.get('/user', auth(responseHandler.unauthorized), method.GET.user);
app.post('/user', auth(responseHandler.unauthorized), method.POST.user);
app.get('/records/available/patient', auth(responseHandler.unauthorized), method.GET['records/available/patient']);
app.post('/patient/create/self', auth(responseHandler.unauthorized), method.POST['patient/create/self']);
app.post('/record/view', auth(responseHandler.unauthorized), method.POST['record/view']);
app.post('/record/create', auth(responseHandler.unauthorized), method.POST['record/create']);
app.post('/record/edit', auth(responseHandler.unauthorized), method.POST['record/edit']);
app.post('/patient/create', auth(responseHandler.unauthorized), method.POST['patient/create']);
app.post('/patient/edit', auth(responseHandler.unauthorized), method.POST['patient/edit']);
app.post('/patient/remove', auth(responseHandler.unauthorized), method.POST['patient/remove']);
// app.post('/certificate', auth(responseHandler.unauthorized), function (req, res) {
//     res.set({
//         'Content-Type': 'application/json'
//     });

//     switch (req.body.action) {
//         case 'view': {
//             doQuery(async (q) => {
//                 let view = await doViewCertifications(
//                     q,
//                     Number(req.session.userInfo.personID)
//                 );

//                 if (view instanceof CertificateError) {
//                     throw view;
//                 }

//                 res.send(JSON.parse(view));
//             }, (err) => {
//                 console.log(err);
//                 res.send("null");
//             });
//             break;
//         }
//         case 'create': {
//             doQuery(async (q) => {
//                 let create = await doCreateCertification(
//                     q,
//                     Number(req.session.userInfo.personID),
//                     Number(req.body.vaccineID),
//                     req.body.data
//                 );

//                 if (create instanceof CertificateError) {
//                     throw create;
//                 }

//                 res.send(String(create == 1));
//             }, () => {
//                 res.send("false");
//             });
//             break;
//         }
//         case 'edit': {
//             doQuery(async (q) => {
//                 let edit = await doEditCertification(
//                     q,
//                     Number(req.session.userInfo.personID),
//                     Number(req.body.certificationID),
//                     req.body.data
//                 );

//                 if (edit instanceof CertificateError) {
//                     throw edit;
//                 }

//                 res.send(String(edit == 1));
//             }, () => {
//                 res.send("false");
//             });
//             break;
//         }
//         default: {
//             res.send("null");
//         }
//     }
// });
// app.post('/patient', auth(responseHandler.unauthorized), function (req, res) {
//     res.set({
//         'Content-Type': 'application/json'
//     });

//     switch (req.body.action) {
//         case 'view': {
//             doQuery(async (q) => {
//                 let view = await doViewPatient(
//                     q,
//                     Number(req.session.userInfo.vaccinePatientID)
//                 );
//                 delete view.id;

//                 if (view instanceof PatientError) {
//                     throw view;
//                 }

//                 res.send(JSON.parse(view));
//             }, () => {
//                 res.send("null");
//             });
//             break;
//         }
//         case 'create': {
//             doQuery(async (q) => {
//                 let create = await doCreatePatient(
//                     q,
//                     req.body.data,
//                     Number(req.session.userInfo.personID)
//                 );

//                 if (create instanceof PatientError) {
//                     throw create;
//                 }

//                 res.send(String(create == 1));
//             }, () => {
//                 res.send("false");
//             });
//             break;
//         }
//         case 'edit': {
//             doQuery(async (q) => {
//                 let edit = await doEditPatient(
//                     q,
//                     Number(req.session.userInfo.vaccinePatientID),
//                     req.body.data
//                 );

//                 if (edit instanceof PatientError) {
//                     throw edit;
//                 }

//                 res.send(String(edit == 1));
//             }, () => {
//                 res.send("null");
//             });
//             break;
//         }
//         default: {
//             res.send("null");
//         }
//     }
// });
// app.post('/records', auth(responseHandler.unauthorized), function (req, res) {
//     res.set({
//         'Content-Type': 'application/json'
//     });

//     switch (req.body.action) {
//         case 'view': {
//             doQuery(async (q) => {
//                 let view = await doViewRecords(
//                     q,
//                     Number(req.session.userInfo.personID)
//                 );

//                 if (view instanceof RecordError) {
//                     throw view;
//                 }

//                 res.send(JSON.parse(view));
//             }, () => {
//                 res.send("null");
//             });

//             break;
//         }
//         case 'create': {
//             doQuery(async (q) => {
//                 let create = await doCreateRecord(
//                     q,
//                     Number(req.session.userInfo.vaccinePatientID)
//                 );

//                 if (create instanceof RecordError) {
//                     throw create;
//                 }

//                 res.send(String(create == 1));
//             }, () => {
//                 res.send("false")
//             });

//             break;
//         }
//         case 'vaccinate': {
//             doQuery(async (q) => {
//                 let vaccinate = await doVaccination(
//                     q,
//                     req.body.data.vaccine,
//                     Number(req.body.vaccineRecordID),
//                     req.body.data.vaccineRecord
//                 );

//                 if (vaccinate instanceof RecordError) {
//                     throw vaccinate;
//                 }

//                 res.send(String(vaccinate == 1));
//             }, () => {
//                 res.send("false");
//             });
//             break;
//         }
//         default: {
//             res.send("null");
//         }
//     }
// });
// app.post('/parenting', auth(responseHandler.unauthorized), function (req, res) {
//     res.set({
//         'Content-Type': 'application/json'
//     });

//     switch (req.body) {
//         case 'view': {
//             doQuery(async (q) => {
//                 let view = await doViewParenting(
//                     q,
//                     Number(req.session.userInfo.personID)
//                 );

//                 if (view instanceof ParentingError) {
//                     throw view;
//                 }

//                 res.send(JSON.parse(view));
//             }, () => {
//                 res.send("null");
//             });
//             break;
//         }
//         case 'create': {
//             doQuery(async (q) => {
//                 let create = await doCreateParenting(
//                     q,
//                     Number(req.session.userInfo.personID),
//                     Number(req.body.vaccinePatientID)
//                 );

//                 if (create instanceof ParentingError) {
//                     throw create;
//                 }

//                 res.send(String(create == 1));
//             }, () => {
//                 res.send("false");
//             });
//             break;
//         }
//         default: {
//             res.send("null");
//         }
//     }
// });

app.post('/', function (req, res) {
    res.send('null');
});

// ============= Initialization ============= //
app.listen(port, function () { });