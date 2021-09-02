const crypto = require('crypto');
const Auth = require('./src/authorization');
const ActiveStorage = require('./src/active-storage');
const Rules = require('./src/request-response-rules');
const Query = require('./src/query');
const DBConnection = require('./src/database-connection');
const Error = require('./src/error');
const App = require('./src/express-app');
const { ExpressMultipartResponse, MultipartReader, MultipartBuilder, createFileFieldHeaders } = require('./src/multipart');
const Mime = require('./src/mime');

/**
 * @typedef {import('express').RequestHandler} R
 *  RequestHandler callback from Express.js.
 * 
 * @typedef {import('./src/query/certificate').ViewOfBreifyCertificate} ViewOfBreifyCertificate
 *
 * @typedef {import("./src/query/certificate").ViewOfCertificate} ViewOfCertificate
 * 
 * @typedef {import("./src/query/certificate").Certification} Certification
 * 
 * @typedef {Object} Field
 * 
 * @property {String} name
 * @property {String} [filename]
 * @property {String|Buffer} value
 */

/** @namespace */
const whitelistFields = {
    /** @type {Array<import('multer').Field>} */
    'certificate/edit': [
        { name: 'vaccine_patient_id', maxCount: 1, },
        { name: 'fullname_in_cert', maxCount: 1, },
        { name: 'nationality', maxCount: 1, },
        { name: 'sex', maxCount: 1, },
        { name: 'against_description', maxCount: 1, },
        { name: 'signature', maxCount: 1, },
        { name: 'certification_list', maxCount: Number.POSITIVE_INFINITY, },
    ]
};

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
        res.sendStatus(Rules.httpCode.BAD_REQUEST).end();
    }
}

/**
 * Get the array instance of summarized fields.
 * 
 * @param {import('express').Request} req 
 * @returns {Field[]}
 */
function getMulterFieldArray(req) {
    const fields = [];
    // Non-file fields
    for (let e of Object.entries(req.body)) {
        const value = e[1];
        const name = e[0];
        if (Array.isArray(value)) {
            for (let v of value) {
                fields.push({ name, value: v, });
            }
        } else {
            fields.push({ name, value, });
        }
    }

    // File fields
    for (let e of Object.entries(req.files)) {
        const value = e[1];
        const name = e[0];
        if (Array.isArray(value)) {
            for (let v of value) {
                fields.push({ name, value: v.buffer, filename: v.originalname, });
            }
        } else {

            fields.push({ name, value: value.buffer, filename: value.originalname, });
        }
    }

    return fields;
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

                        else {
                            res.send(null);
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

                        else {
                            res.send(null);
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

                        else {
                            res.send(null);
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

                        else {
                            res.send(null);
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
                        else {
                            res.send(null);
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

                        else {
                            res.send(null);
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

                        else {
                            res.send(null);
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
                        else {
                            res.send(null);
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

                        else {
                            res.send(null);
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
                    try {

                        /** @type {ViewOfBreifyCertificate} */
                        const result = await DBConnection.query(async client => await Query.certificate.viewBriefyCertificate(
                            client,
                            (Auth.decode(req.headers.authorization) || {}).username,
                            req.body.patient_id,
                        ));

                        if (result !== null) {
                            const formdata = new ExpressMultipartResponse(res);

                            const isFileField = (n) => n == 'signature' || n == 'certificate_list';

                            for (let n in result) {
                                var value = result[n];

                                if(value instanceof Date){
                                    value = value.toISOString();
                                }

                                if (n == 'certificate_list') {
                                    formdata.append(n, JSON.stringify(value), `${n}_${crypto.randomUUID()}.json`, createFileFieldHeaders('application/json'));
                                    continue;
                                }

                                formdata.append(n, value, ...(isFileField(n) && value !== null ? [
                                    crypto.randomUUID(), createFileFieldHeaders(await Mime.get(value))
                                ] : []));

                            }

                            formdata.finalize().end();
                        } else {
                            new ExpressMultipartResponse(res).finalize().end();
                        }
                    } catch (error) {
                        res.contentType('application/json')
                            .send(Error.QueryResultError.unexpected(error).toObject())
                            .end();
                    }
                })();
            },
        ],
        '/certificate/view/each': [
            App.acceptJson(),
            authorization,
            checkParams('certificate/view/each'),
            /** @type {R} */
            function (req, res) {
                (async () => {
                    try {

                        /** @type {Certification} */
                        const result = await DBConnection.query(async client => await Query.certificate.viewEachCertification(
                            client,
                            (Auth.decode(req.headers.authorization) || {}).username,
                            req.body.patient_id,
                            req.body.certificate_id,
                        ));

                        if (result !== null) {
                            const formdata = new ExpressMultipartResponse(res);

                            const isFileField = (n) => n == 'clinician_signature' || n == 'administring_centre_stamp';

                            for (let n in result) {
                                var value = result[n];

                                if(value instanceof Date){
                                    value = value.toISOString();
                                }

                                formdata.append(n, value, ...(isFileField(n) && value !== null ? [
                                    crypto.randomUUID(),
                                    createFileFieldHeaders(await Mime.get(value))
                                ] : []));
                            }

                            formdata.finalize().end();
                        } else {
                            new ExpressMultipartResponse(res).finalize().end();
                        }
                    } catch (error) {
                        res.contentType('application/json')
                            .send(Error.QueryResultError.unexpected(error).toObject())
                            .end();
                    }


                })();
            }
        ],
        // /** Ongoing */
        '/certificate/view/complete': [
            App.acceptJson(),
            authorization,
            checkParams('certificate/view/complete'),
            /** @type {R} */
            function (req, res) {
                (async () => {
                    try {

                        /** @type {ViewOfCertificate} */
                        const result = await DBConnection.query(async client => await Query.certificate.getCompleteCertification(
                            client,
                            (Auth.decode(req.headers.authorization) || {}).username,
                            req.body.patient_id,
                        ));

                        if (result !== null) {
                            const formdata = new ExpressMultipartResponse(res);

                            for (let n in result) {
                                var value = result[n];

                                if (n == 'certificate_list') {
                                    for (let li of result.certificate_list) {
                                        let builder = new MultipartBuilder();
                                        for (let n in li) {
                                            if (n == 'clinician_signature' || n == 'administring_centre_stamp') {
                                                builder.append(n, li[n], ...(
                                                    li[n] !== null ?
                                                        [
                                                            crypto.randomUUID(),
                                                            createFileFieldHeaders(await Mime.get(li[n]))
                                                        ] :
                                                        []
                                                )
                                                );

                                                continue;
                                            }

                                            if(n == 'certify_from' || n == 'certify_to'){
                                                builder.append(n, li[n] !== null ? new Date(li[n]).toISOString() : null);
                                                continue;
                                            }

                                            builder.append(n, li[n]);
                                        }

                                        formdata.append(
                                            'certificate_list',
                                            builder.toBuffer(false),
                                            crypto.randomUUID(),
                                            createFileFieldHeaders(`multipart/mixed; boundary=${builder.boundary}`)
                                        );
                                    }
                                    continue;
                                }

                                if(value instanceof Date){
                                    value = value.toISOString();
                                }

                                formdata.append(n, value,
                                    ...(n == 'signature' && value !== null ? [
                                        crypto.randomUUID(),
                                        {
                                            'Content-Type': await Mime.get(value),
                                        }
                                    ] : []
                                    )
                                );
                            }

                            formdata.finalize().end();
                        }
                    } catch (error) {
                        console.log(error);
                        res.contentType('application/json')
                            .send(Error.QueryResultError.unexpected(error).toObject())
                            .end();
                    }


                })();
            }
        ],
        '/certificate/edit': [
            App.acceptFormData(whitelistFields['certificate/edit']),
            authorization,
            /** @type {R} */
            function (req, res) {
                (async () => {
                    res.contentType('application/json');

                    try {

                        const fields = getMulterFieldArray(req);

                        /** @type {ViewOfCertificate} */
                        const input = {};

                        for (let v of fields) {
                            if (v.name == 'certification_list') {
                                if (!('certificate_list' in input)) input.certificate_list = [];
                                const reader = new MultipartReader(v.value);
                                /** @type {Certification} */
                                const certificate = {};
                                /** @type {(import('./src/multipart').MultipartField)[]}*/
                                const list = reader.get();
                                for (let o of list) {

                                    switch (o.name) {
                                        case 'clinician_signature':
                                        case 'administring_centre_stamp':
                                            if (o.type == 'file') {
                                                certificate[o.name] = o.value;
                                            }
                                            break;
                                        case 'clinician_prof_status':
                                        case 'vaccine_name':
                                        case 'vaccine_batch_number':
                                        case 'vaccine_manufacturer':
                                        case 'certify_from':
                                        case 'certify_to':
                                            certificate[o.name] = o.value;
                                            break;
                                        case 'id':
                                            certificate[o.name] = Number(o.value);
                                            break;
                                        default:
                                    }
                                }

                                input.certificate_list.push(certificate);
                                continue;
                            }

                            try {
                                input[v.name] = JSON.parse(v.value);
                            } catch (error) {
                                input[v.name] = v.value;
                            }
                        }

                        const result = await DBConnection.query(async client => await Query.certificate.editCertificate(
                            client,
                            (Auth.decode(req.headers.authorization) || {}).username,
                            input,
                        ));


                        if (result !== null) {
                            res.send({ success: true });
                        } else {
                            res.send(null);
                        }
                    } catch (error) {
                        console.log(error);
                        res.send(Error.QueryResultError.unexpected(error).toObject());
                    }

                    res.end();
                })();
            },
        ],
        '/certificate/available': [
            App.acceptJson(),
            authorization,
            checkParams('certificate/available'),
            /** @type {R} */
            function (req, res) {
                (async () => {
                    res.contentType('application/json');
                    try {

                        const result = await DBConnection.query(async client => await Query.certificate.getAvailableVaccination(
                            client,
                            (Auth.decode(req.headers.authorization) || {}).username,
                            req.body.patient_id
                        ));

                        if (result !== null) {
                            res.send(result);
                        }

                        else {
                            res.send(null);
                        }
                    } catch (error) {
                        res.send(Error.QueryResultError.unexpected(error).toObject());
                    }

                    res.end();
                })();
            },
        ],
        '/certificate/create': [
            App.acceptJson(),
            authorization,
            checkParams('certificate/create'),
            /** @type {R} */
            function (req, res) {
                (async () => {
                    res.contentType('application/json');
                    try {

                        const result = await DBConnection.query(async client => await Query.certificate.createCertification(
                            client,
                            (Auth.decode(req.headers.authorization) || {}).username,
                            req.body.patient_id,
                            req.body.vaccine_against_list
                        ));

                        if (result !== null) {
                            res.send({ success: true });
                        }

                        else {
                            res.send(null);
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