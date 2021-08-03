const crypto = require('crypto');
const Auth = require('./src/authorization');
const ActiveStorage = require('./src/active-storage');
const Rules = require('./src/request-response-rules');
const Query = require('./src/query');
const DBConnection = require('./src/database-connection');
const Error = require('./src/error');
const App = require('./src/express-app');
const FormDataBuilder = require('./src/formdata-builder');

/**
 * @typedef {import('express').RequestHandler} R
 *  RequestHandler callback from Express.js.
 * 
 * @typedef {import('./src/query/certificate').ViewOfBreifyCertificate} ViewOfBreifyCertificate
 */

/**
 * Perform checking authorization header from request to content access allowance.
 * If it is not authorized, reject the request with [UNAUTHORIZED] http code.
 * @type {R}
 */
function authorization(req, res, next) {
    var token = `${req.headers.authorization}`.split(' ')[1];
    var username = (Auth.decode(req.headers.authorization) || {}).username;
    ActiveStorage.authentication.get(username, token)
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
    var token = `${req.headers.authorization}`.split(' ')[1];
    var username = (Auth.decode(req.headers.authorization) || {}).username;
    ActiveStorage.authentication.get(username, token)
        .then((c) => {
            // Response [OK] http code with JSON message for allowing client to be more accessible.
            res.status(200)
                .contentType('application/json')
                .send({
                    'authorization': true
                })
                .end();
        })
        .catch((e) => {
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
        res.sendStatus(Rules.httpCode.BAD_REQUEST).end();
    }
}

function multerForCertificateEditing() {
    const paramList = [
        'id',
        'vaccine_briefing',
        'certify_from',
        'certify_to',
        'clinician_prof_status',
        'clinician_signature',
        'administering_center_stamp',
        'vaccine_manufacturer',
        'vaccine_batch_number'
    ];
    const o = {};
    for (let g of paramList) o[g] = 1;

    return ActiveStorage.multipartFormData.use(o);
}

App.route({
    GET: {
        '/user/view': [
            authorization,
            checkParams('user/view'),
            /** @type {R} */
            function (req, res) {
                (async () => {
                    res.contentType('application/json');

                    try {
                        const username = (Auth.decode(req.headers.authorization) || {}).username;
                        const result = await DBConnection.query(async client => await Query.user.viewUser(
                            client,
                            username,
                        ));

                        if (result !== null) {
                            res.send({ username, ...result, });
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
                    res.contentType('application/json');

                    try {
                        const username = (Auth.decode(req.headers.authorization) || {}).username;
                        const result = await DBConnection.query(async client => await Query.patient.getAvailablePatients(
                            client,
                            username,
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
                res.contentType('application/json');

                ActiveStorage.authentication.remove(req.headers.authorization).then(() => {
                    res.send({});
                }).catch(() => {
                    res.send(Error.QueryResultError.unexpected().toObject());
                });
            },
        ]
    },
    POST: {
        '/login': [
            App.acceptJson(),
            loginAuthorization,
            checkParams('login'),
            /** @type {R} */
            function (req, res) {
                (async () => {
                    res.contentType('application/json');

                    try {
                        await DBConnection.query(async client => await Query.user.logIn(
                            client, req.body.username, req.body.password
                        ));

                        const currentTime = Date.now();
                        await ActiveStorage.authentication.put(req.body.username, currentTime);
                        res.send({
                            'authorization':
                                Auth.encode(req.body.username, currentTime)
                        });
                    } catch (error) {
                        res.send(Error.QueryResultError.unexpected(error).toObject());
                    }

                    res.end();
                })();
            },
        ],
        '/signup': [
            App.acceptJson(),
            loginAuthorization,
            checkParams('signup'),
            /** @type {R} */
            function (req, res) {
                (async () => {
                    res.contentType('application/json');

                    try {
                        await DBConnection.query(async client => await Query.user.signUp(client, req.body));
                        const currentTime = Date.now();
                        await ActiveStorage.authentication.put(req.body.username, currentTime);
                        res.send({
                            'authorization': Auth.encode(req.body.username, currentTime)
                        });
                    } catch (error) {
                        res.send(Error.QueryResultError.unexpected(error).toObject());
                    }

                    res.end();
                })();
            }
        ],
        '/user/edit/info': [
            App.acceptJson(),
            authorization,
            checkParams('user/edit/info'),
            /** @type {R} */
            function (req, res) {
                (async () => {
                    res.contentType('application/json');

                    try {
                        const username = (Auth.decode(req.headers.authorization) || {}).username;
                        const result = await DBConnection.query(async client => await Query.user.editUserInfo(
                            client,
                            username,
                            req.body
                        ));

                        if (result !== null) {
                            res.send({
                                username,
                                ...result,
                            });
                        }
                    } catch (error) {
                        res.send(Error.QueryResultError.unexpected(error).toObject());
                    }

                    res.end();
                })();
            }
        ],
        '/user/edit/account': [
            App.acceptJson(),
            authorization,
            checkParams('user/edit/account'),
            /** @type {R} */
            function (req, res) {
                (async () => {
                    res.contentType('application/json');
                    try {

                        await DBConnection.query(async client => Query.user.editUserAccount(
                            client,
                            (Auth.decode(req.headers.authorization) || {}).username,
                            {
                                "old": req.body.old_password,
                                "new": req.body.new_password,
                            }
                        ));

                        res.send({ success: true });
                    } catch (error) {
                        res.send(Error.QueryResultError.unexpected(error).toObject());
                    }

                    res.end();
                })();
            }
        ],
        '/record/view': [
            App.acceptJson(),
            authorization,
            checkParams('record/view'),
            /** @type {R} */
            function (req, res) {
                (async () => {
                    res.contentType('application/json');
                    try {

                        const result = await DBConnection.query(async client => await Query.records.viewRecord(
                            client,
                            (Auth.decode(req.headers.authorization) || {}).username,
                            req.body.patient_id
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
            App.acceptJson(),
            authorization,
            checkParams('record/create'),
            /** @type {R} */
            function (req, res) {
                (async () => {
                    res.contentType('application/json');

                    try {

                        const result = await DBConnection.query(async client => await Query.records.createRecord(
                            client,
                            (Auth.decode(req.headers.authorization) || {}).username,
                            req.body.patient_id
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
            App.acceptJson(),
            authorization,
            checkParams('record/edit'),
            /** @type {R} */
            function (req, res) {
                res.contentType('application/json');
                (async () => {
                    try {

                        const result = await DBConnection.query(async client => await Query.records.editRecord(
                            client,
                            (Auth.decode(req.headers.authorization) || {}).username,
                            req.body
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
            App.acceptJson(),
            authorization,
            checkParams('patient/create'),
            /** @type {R} */
            function (req, res) {
                (async () => {
                    res.contentType('application/json');
                    try {

                        const result = await DBConnection.query(async client => await Query.patient.createPatientAsChild(
                            client,
                            (Auth.decode(req.headers.authorization) || {}).username,
                            req.body
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
            App.acceptJson(),
            authorization,
            checkParams('patient/create/self'),
            /** @type {R} */
            function (req, res) {
                (async () => {
                    res.contentType('application/json');
                    try {

                        const result = await DBConnection.query(async client => await Query.patient.createPatientForSelf(
                            client,
                            (Auth.decode(req.headers.authorization) || {}).username,
                            req.body
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
            App.acceptJson(),
            authorization,
            checkParams('patient/edit'),
            /** @type {R} */
            function (req, res) {
                (async () => {
                    res.contentType('application/json');
                    try {

                        const authorization = (Auth.decode(req.headers.authorization) || {}).username;

                        const result = await DBConnection.query(async client => await Query.patient.editPatient(
                            client,
                            authorization,
                            req.body['patient_id'],
                            {
                                firstname: req.body['firstname'],
                                lastname: req.body['lastname'],
                            }
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
            App.acceptJson(),
            authorization,
            checkParams('certificate/view'),
            /** @type {R} */
            function (req, res) {
                (async () => {
                    res.contentType('multipart/form-data');
                    try {

                        /** @type {ViewOfBreifyCertificate} */
                        const result = await DBConnection.query(async client => await Query.certificate.viewBriefyCertificate(
                            client,
                            (Auth.decode(req.headers.authorization) || {}).username,
                            req.body.patient_id,
                        ));

                        if (result !== null) {
                            const formdata = new FormDataBuilder(res);

                            for(let n in result){
                                var value = result[n];
                                if(n == 'signature'){
                                    value = String(value).split('');
                                }
                                formdata.append(n, value, {
                                    filename: n == 'signature' ? crypto.randomUUID() : null,
                                });
                            }

                            formdata.finalize().end();
                            res.send(result);
                        }
                    } catch (error) {
                        console.log(error);
                        res.send(Error.QueryResultError.unexpected(error).toObject());
                    }

                    res.end();
                })();
            },
        ],
        // '/certificate/view/header': [
        //     authorization,
        //     checkParams('certificate/view/header'),
        //     /** @type {R} */
        //     function (req, res) {
        //         (async () => {
        //             res.contentType('application/json');
        //             try {

        //                 const result = await DBConnection.query(async client => await Query.certificate.viewCertificateHeader(
        //                     client,
        //                     (Auth.decode(req.headers.authorization) || {}).username,
        //                     req.body.patient_id
        //                 ));

        //                 if (result !== null) {
        //                     res.send(result);
        //                 }
        //             } catch (error) {
        //                 res.send(Error.QueryResultError.unexpected(error).toObject());
        //             }

        //             res.end();
        //         })();
        //     },
        // ],
        // '/certificate/available': [
        //     authorization,
        //     checkParams('certificate/available'),
        //     /** @type {R} */
        //     function (req, res) {
        //         (async () => {
        //             res.contentType('application/json');
        //             try {

        //                 const result = await DBConnection.query(async client => await Query.certificate.getAvailableVaccination(
        //                     client,
        //                     (Auth.decode(req.headers.authorization) || {}).username,
        //                     req.body.patient_id
        //                 ));

        //                 if (result !== null) {
        //                     res.send(result);
        //                 }
        //             } catch (error) {
        //                 res.send(Error.QueryResultError.unexpected(error).toObject());
        //             }

        //             res.end();
        //         })();
        //     },
        // ],
        // '/certificate/create': [
        //     authorization,
        //     checkParams('certificate/create'),
        //     /** @type {R} */
        //     function (req, res) {
        //         (async () => {
        //             res.contentType('application/json');
        //             try {

        //                 const result = await DBConnection.query(async client => await Query.certificate.createCertification(
        //                     client,
        //                     (Auth.decode(req.headers.authorization) || {}).username,
        //                     req.body
        //                 ));

        //                 if (result !== null) {
        //                     res.send(result);
        //                 }
        //             } catch (error) {
        //                 res.send(Error.QueryResultError.unexpected(error).toObject());
        //             }

        //             res.end();
        //         })();
        //     },
        // ],
        // '/certificate/list': [
        //     authorization,
        //     checkParams('certificate/list'),
        //     /** @type {R} */
        //     function (req, res) {
        //         (async () => {
        //             res.contentType('application/json');
        //             try {

        //                 const result = await DBConnection.query(async client => await Query.certificate.getBrieflyCertificationList(
        //                     client,
        //                     (Auth.decode(req.headers.authorization) || {}).username,
        //                     req.body.patient_id
        //                 ));

        //                 if (result !== null) {
        //                     res.send(result);
        //                 }
        //             } catch (error) {
        //                 res.send(Error.QueryResultError.unexpected(error).toObject());
        //             }

        //             res.end();
        //         })();
        //     },
        // ],
        // '/certificate/list/details': [
        //     authorization,
        //     checkParams('certificate/list/details'),
        //     /** @type {R} */
        //     function (req, res) {
        //         (async () => {
        //             res.contentType('application/json');

        //             try {

        //                 const result = await DBConnection.query(async client => await Query.certificate.getDetailedCertificationList(
        //                     client,
        //                     (Auth.decode(req.headers.authorization) || {}).username,
        //                     req.body
        //                 ));

        //                 if (result !== null) {
        //                     res.send(result);
        //                 }
        //             } catch (error) {
        //                 res.send(Error.QueryResultError.unexpected(error).toObject());
        //             }

        //             res.end();
        //         })();
        //     },
        // ],
        // '/certificate/edit': [
        //     authorization,
        //     multerForCertificateEditing(),
        //     /** @type {R} */
        //     function (req, res) {
        //         (async () => {
        //             res.contentType('application/json');

        //             try {

        //                 const result = await DBConnection.query(async client => await Query.certificate.editCertificate(
        //                     client,
        //                     (Auth.decode(req.headers.authorization) || {}).username,
        //                     req.body
        //                 ));

        //                 if (result !== null) {
        //                     res.send(result);
        //                 }
        //             } catch (error) {
        //                 res.send(Error.QueryResultError.unexpected(error).toObject());
        //             }

        //             res.end();
        //         })();
        //     },
        // ],
        // '/certificate/edit/header': [
        //     authorization,
        //     checkParams('certificate/edit/header'),
        //     /** @type {R} */
        //     function (req, res) {
        //         (async () => {
        //             res.contentType('application/json');
        //             try {

        //                 const result = await DBConnection.query(async client => await Query.certificate.editCertificateHeader(
        //                     client,
        //                     (Auth.decode(req.headers.authorization) || {}).username,
        //                     req.body
        //                 ));

        //                 if (result !== null) {
        //                     res.send(result);
        //                 }
        //             } catch (error) {
        //                 res.send(Error.QueryResultError.unexpected(error).toObject());
        //             }

        //             res.end();
        //         })();
        //     },
        // ],

    }
});


App.init();