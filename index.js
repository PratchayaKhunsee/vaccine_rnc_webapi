const App = require('./src/express-app');
const Auth = require('./src/authorization');
const ActiveStorage = require('./src/active-storage');
const Rules = require('./src/request-response-rules');
const Query = require('./src/query');
const DBConnection = require('./src/database-connection');
const Error = require('./src/error');

/**
 * @typedef {import('express').RequestHandler} R
 *  RequestHandler callback from Express.js.
 */

/**
 * Perform checking authorization header from request to content access allowance.
 * If it is not authorized, reject the request with [UNAUTHORIZED] http code.
 * @type {R}
 */
function authorization(req, res, next) {
    ActiveStorage.authentication.get(req.headers.authorization)
        .then(() => {
            // Allow to perform the next task
            next();
        })
        .catch(() => {
            res.sendStatus(Rules.httpCode.UNAUTHORIZED);
        });
}

/**
 * Perform checking authorization header when requested on login or singup route
 * If it is not authorized, let user to perform the next task.
 * @type {R}
 **/
function loginAuthorization(req, res, next) {
    ActiveStorage.authentication.get(req.headers.authorization)
        .then((c) => {

            // Response [OK] http code with no content for allowing client to be more accessible.
            res.status(200).send('');

        })
        .catch((e) => {
            console.log(e);
            next();
        });
}

/**
 * Check parameters form request. If it is not correct, response the client with [BAD_REQUEST] http code.
 * @param {import('./src/request-response-rules').RoutingPathNameList} pathname 
 */
function checkParams(pathname) {
    return handler;

    /** @type {R} */
    function handler(req, res, next) {
        if (pathname in Rules.requestParameters && Rules.requestParameters.check(pathname, req.body)) {
            next();
            return;
        }
        // console.log(req.body);
        res.sendStatus(Rules.httpCode.BAD_REQUEST);
    }
}

App.route({
    GET: {
        '/user/view': [
            authorization,
            checkParams('user/view'),
            /** @type {R} */
            function (req, res) {
                (async () => {
                    try {

                        const result = await DBConnection.query(async client => await Query.user.viewUser(
                            client,
                            (Auth.decode(req.headers.authorization) || {}).username,
                        ));

                        if (result !== null) {
                            res.send(result);
                        }
                    } catch (error) {
                        res.send(Error.QueryResultError.unexpected(error).toObject());
                    }

                    res.end();
                })();


            },
        ],
        '/patient/view': [
            authorization,
            checkParams('patient/view'),
            /** @type {R} */
            function (req, res) {
                (async () => {
                    try {

                        const result = await DBConnection.query(async client => await Query.patient.viewPatient(
                            client,
                            (Auth.decode(req.headers.authorization) || {}).username,
                            req.params.patient_id
                        ));

                        if (result !== null) {
                            res.send(result);
                        }
                    } catch (error) {
                        res.send(Error.QueryResultError.unexpected(error).toObject());
                    }

                    res.end();
                })();
            },
        ],
        '/logout': [
            authorization,
            /** @type {R} */
            function (req, res) {
                ActiveStorage.authentication.remove(req.headers.authorization).then(() => {
                    res.send();
                }).catch(() => {
                    res.send(Error.QueryResultError.unexpected().toObject());
                });
            },
        ]
    },
    POST: {
        '/login': [
            loginAuthorization,
            checkParams('login'),
            /** @type {R} */
            function (req, res) {
                console.log('Go to login process');
                (async () => {
                    try {
                        const result = await DBConnection.query(async client => await Query.user.logIn(client));

                        if (result) {
                            const currentTime = Date.now();
                            await ActiveStorage.authentication.put(req.params.username, currentTime);
                            res.send(Auth.encode(req.params.username, currentTime));
                            return;
                        }
                        
                        console.log(result);
                    } catch (error) {
                        console.log(error);
                        res.send(Error.QueryResultError.unexpected(error).toObject());
                    }

                    res.end();
                })();
            },
        ],
        '/signup': [
            loginAuthorization,
            checkParams('signup'),
            /** @type {R} */
            function (req, res) {
                (async () => {
                    try {
                        const result = await DBConnection.query(async client => await Query.user.signUp(client));

                        if (result === true) {
                            const currentTime = Date.now();
                            await ActiveStorage.authentication.put(req.params.username, currentTime);
                            res.send(Auth.encode(req.params.username, currentTime));
                        }
                    } catch (error) {
                        res.send(Error.QueryResultError.unexpected(error).toObject());
                    }

                    res.end();
                })();
            }
        ],
        '/user/edit/info': [
            authorization,
            checkParams('user/edit/info'),
            /** @type {R} */
            function (req, res) {
                (async () => {
                    try {

                        const result = await DBConnection.query(async client => await Query.user.editUserInfo(
                            client,
                            (Auth.decode(req.headers.authorization) || {}).username,
                            req.params
                        ));

                        if (result !== null) {
                            res.send(result);
                        }
                    } catch (error) {
                        res.send(Error.QueryResultError.unexpected(error).toObject());
                    }

                    res.end();
                })();
            }
        ],
        '/user/edit/account': [
            authorization,
            checkParams('user/edit/account'),
            /** @type {R} */
            function (req, res) {
                (async () => {
                    try {

                        const result = await DBConnection.query(async client => Query.user.editUserAccount(
                            client,
                            (Auth.decode(req.headers.authorization) || {}).username,
                            req.params
                        ));

                        if (result === true) {
                            res.send(result);
                        }
                    } catch (error) {
                        res.send(Error.QueryResultError.unexpected(error).toObject());
                    }

                    res.end();
                })();
            }
        ],
        '/record/view': [
            authorization,
            checkParams('record/view'),
            /** @type {R} */
            function (req, res) {
                (async () => {
                    try {

                        const result = await DBConnection.query(async client => await Query.records.viewRecord(
                            client,
                            (Auth.decode(req.headers.authorization) || {}).username,
                            req.params.patient_id
                        ));

                        if (result !== null) {
                            res.send(result);
                        }
                    } catch (error) {
                        res.send(Error.QueryResultError.unexpected(error).toObject());
                    }

                    res.end();
                })();
            }
        ],
        '/record/create': [
            authorization,
            checkParams('record/create'),
            /** @type {R} */
            function (req, res) {
                (async () => {
                    try {

                        const result = await DBConnection.query(async client => await Query.records.createRecord(
                            client,
                            (Auth.decode(req.headers.authorization) || {}).username,
                            req.params.patient_id
                        ));

                        if (result !== null) {
                            res.send(result);
                        }
                    } catch (error) {
                        res.send(Error.QueryResultError.unexpected(error).toObject());
                    }

                    res.end();
                })();
            }
        ],
        '/record/edit': [
            authorization,
            checkParams('record/edit'),
            /** @type {R} */
            function (req, res) {
                (async () => {
                    try {

                        const result = await DBConnection.query(async client => await Query.records.editRecord(
                            client,
                            (Auth.decode(req.headers.authorization) || {}).username,
                            req.params
                        ));

                        if (result !== null) {
                            res.send(result);
                        }
                    } catch (error) {
                        res.send(Error.QueryResultError.unexpected(error).toObject());
                    }

                    res.end();
                })();
            },
        ],
        '/patient/create': [
            authorization,
            checkParams('patient/create'),
            /** @type {R} */
            function (req, res) {
                (async () => {
                    try {

                        const result = await DBConnection.query(async client => await Query.patient.createPatientAsChild(
                            client,
                            (Auth.decode(req.headers.authorization) || {}).username,
                            req.params
                        ));

                        if (result !== null) {
                            res.send(result);
                        }
                    } catch (error) {
                        res.send(Error.QueryResultError.unexpected(error).toObject());
                    }

                    res.end();
                })();
            },
        ],
        '/patient/create/self': [
            authorization,
            checkParams('patient/create/self'),
            /** @type {R} */
            function (req, res) {
                (async () => {
                    try {

                        const result = await DBConnection.query(async client => await Query.patient.createPatientForSelf(
                            client,
                            (Auth.decode(req.headers.authorization) || {}).username,
                            req.params
                        ));

                        if (result !== null) {
                            res.send(result);
                        }
                    } catch (error) {
                        res.send(Error.QueryResultError.unexpected(error).toObject());
                    }

                    res.end();
                })();
            },
        ],
        '/patient/edit': [
            authorization,
            checkParams('patient/edit'),
            /** @type {R} */
            function (req, res) {
                (async () => {
                    try {

                        const result = await DBConnection.query(async client => await Query.patient.editPatient(
                            client,
                            (Auth.decode(req.headers.authorization) || {}).username,
                            req.params
                        ));

                        if (result !== null) {
                            res.send(result);
                        }
                    } catch (error) {
                        res.send(Error.QueryResultError.unexpected(error).toObject());
                    }

                    res.end();
                })();
            },
        ],
        '/patient/view': [
            authorization,
            checkParams('patient/view'),
            /** @type {R} */
            function (req, res) {
                (async () => {
                    try {

                        const result = await DBConnection.query(async client => await Query.patient.viewPatient(
                            client,
                            (Auth.decode(req.headers.authorization) || {}).username,
                            req.params
                        ));

                        if (result !== null) {
                            res.send(result);
                        }
                    } catch (error) {
                        res.send(Error.QueryResultError.unexpected(error).toObject());
                    }

                    res.end();
                })();
            },
        ],
        '/certificate/view': [
            authorization,
            checkParams('certificate/view'),
            /** @type {R} */
            function (req, res) {
                (async () => {
                    try {

                        const result = await DBConnection.query(async client => await Query.certificate.viewCertificate(
                            client,
                            (Auth.decode(req.headers.authorization) || {}).username,
                            req.params
                        ));

                        if (result !== null) {
                            res.send(result);
                        }
                    } catch (error) {
                        res.send(Error.QueryResultError.unexpected(error).toObject());
                    }

                    res.end();
                })();
            },
        ],
        '/certificate/view/header': [
            authorization,
            checkParams('certificate/view/header'),
            /** @type {R} */
            function (req, res) {
                (async () => {
                    try {

                        const result = await DBConnection.query(async client => await Query.certificate.viewCertificateHeader(
                            client,
                            (Auth.decode(req.headers.authorization) || {}).username,
                            req.params.patient_id
                        ));

                        if (result !== null) {
                            res.send(result);
                        }
                    } catch (error) {
                        res.send(Error.QueryResultError.unexpected(error).toObject());
                    }

                    res.end();
                })();
            },
        ],
        '/certificate/available': [
            authorization,
            checkParams('certificate/available'),
            /** @type {R} */
            function (req, res) {
                (async () => {
                    try {

                        const result = await DBConnection.query(async client => await Query.certificate.getAvailableVaccination(
                            client,
                            (Auth.decode(req.headers.authorization) || {}).username,
                            req.params.patient_id
                        ));

                        if (result !== null) {
                            res.send(result);
                        }
                    } catch (error) {
                        res.send(Error.QueryResultError.unexpected(error).toObject());
                    }

                    res.end();
                })();
            },
        ],
        '/certificate/create': [
            authorization,
            checkParams('certificate/create'),
            /** @type {R} */
            function (req, res) {
                (async () => {
                    try {

                        const result = await DBConnection.query(async client => await Query.certificate.createCertification(
                            client,
                            (Auth.decode(req.headers.authorization) || {}).username,
                            req.params
                        ));

                        if (result !== null) {
                            res.send(result);
                        }
                    } catch (error) {
                        res.send(Error.QueryResultError.unexpected(error).toObject());
                    }

                    res.end();
                })();
            },
        ],
        '/certificate/list': [
            authorization,
            checkParams('certificate/list'),
            /** @type {R} */
            function (req, res) {
                (async () => {
                    try {

                        const result = await DBConnection.query(async client => await Query.certificate.getBrieflyCertificationList(
                            client,
                            (Auth.decode(req.headers.authorization) || {}).username,
                            req.params.patient_id
                        ));

                        if (result !== null) {
                            res.send(result);
                        }
                    } catch (error) {
                        res.send(Error.QueryResultError.unexpected(error).toObject());
                    }

                    res.end();
                })();
            },
        ],
        '/certificate/list/details': [
            authorization,
            checkParams('certificate/list/details'),
            /** @type {R} */
            function (req, res) {
                (async () => {
                    try {

                        const result = await DBConnection.query(async client => await Query.certificate.getDetailedCertificationList(
                            client,
                            (Auth.decode(req.headers.authorization) || {}).username,
                            req.params
                        ));

                        if (result !== null) {
                            res.send(result);
                        }
                    } catch (error) {
                        res.send(Error.QueryResultError.unexpected(error).toObject());
                    }

                    res.end();
                })();
            },
        ],
        '/certificate/edit': [
            authorization,
            checkParams('certificate/edit'),
            /** @type {R} */
            function (req, res) {
                (async () => {
                    try {

                        const result = await DBConnection.query(async client => await Query.certificate.editCertificate(
                            client,
                            (Auth.decode(req.headers.authorization) || {}).username,
                            req.params
                        ));

                        if (result !== null) {
                            res.send(result);
                        }
                    } catch (error) {
                        res.send(Error.QueryResultError.unexpected(error).toObject());
                    }

                    res.end();
                })();
            },
        ],
        '/certificate/edit/header': [
            authorization,
            checkParams('certificate/edit/header'),
            /** @type {R} */
            function (req, res) {
                (async () => {
                    try {

                        const result = await DBConnection.query(async client => await Query.certificate.editCertificateHeader(
                            client,
                            (Auth.decode(req.headers.authorization) || {}).username,
                            req.params
                        ));

                        if (result !== null) {
                            res.send(result);
                        }
                    } catch (error) {
                        res.send(Error.QueryResultError.unexpected(error).toObject());
                    }

                    res.end();
                })();
            },
        ],

    }
});


App.init();