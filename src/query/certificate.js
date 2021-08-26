/**
 * 
 * 
 * @typedef {Object} CertificationBody
 * @property {Number} id
 * @property {Number} vaccine_patient_id
 * @property {String} clinician_signature
 * @property {String} clinician_prof_status
 * @property {String} certify_from
 * @property {String} certify_to
 * @property {String} adminstering_centre_stamp
 * @property {String} vaccine_against
 * @property {String} vaccine_description
 * @property {String} vaccine_manufacturer
 * @property {String} vaccine_batch_number
 * 
 * @typedef {Object} CertificationHeader
 * @property {Number} sex
 * @property {String} nationality
 * @property {String} signature
 * @property {String} against_description
 * 
 * @typedef {Object} CertificationBriefing
 * @property {Number} vaccine_patient_id
 * @property {String} vaccine_against
 * 
 * @typedef {Object} CertificationCreatingContext
 * @property {Number} patient_id
 * @property {String} against
 * 
 * @typedef {Object} CertificationSelectingContext
 * @property {Number} patient_id
 * @property {Number} certificate_id
 * 
 * @typedef {Object} CertificationFilteringContext
 * @property {Number} patient_id
 * @property {Array<Number>} [certificate_id_list]
 * 
 * @typedef {Object} CertHeaderEditingContext
 * @property {Number} patient_id
 * @property {Number} [sex]
 * @property {String} [nationality]
 * @property {String} [signature]
 * @property {String} [against_description]
 * 
 * @typedef {Object} CertificationData
 * @property {Number} [vaccine_id]
 * @property {Number} [person_id]
 * @property {String} [clinician_signature]
 * @property {String} [clinician_prof_status]
 * @property {String} [certify_from]
 * @property {String} [certify_to]
 * @property {String} [adminstering_centre_stamp]
 * 
 * @typedef {Object} FullCertificate
 * @property {CertificationHeader} header
 * @property {CertificationBody} list
 * 
 */

/** 
 * @namespace Latest
 * 
 * @typedef {Object} BreifyCertification
 * @property {Number} id
 * @property {String} vaccine_against
 * 
 * @typedef {Object} Certification
 * @property {Number} id
 * @property {Number} vaccine_patient_id
 * @property {Buffer|String} clinician_signature
 * @property {String} clinician_prof_status
 * @property {String} certify_from
 * @property {String} certify_to
 * @property {Buffer|String} adminstering_centre_stamp
 * @property {String} vaccine_against
 * @property {String} vaccine_name
 * @property {String} vaccine_manufacturer
 * @property {String} vaccine_batch_number
 * 
 * 
 * @typedef {Object} ViewOfBreifyCertificate
 * Certificate's owner information and id list of certification. 
 * @property {String} fullname_in_cert
 * @property {Number} sex
 * @property {String} nationality
 * @property {Buffer} signature
 * @property {String} against_description 
 * @property {Array<BreifyCertification>} certificate_list
 * 
 * @typedef {Object} ViewOfCertificate
 * Certificate's owner information and list of certification. 
 * @property {Number} [vaccine_patient_id]
 * @property {String} fullname_in_cert
 * @property {Number} sex
 * @property {String} nationality
 * @property {Buffer} signature
 * @property {String} against_description 
 * @property {Array<Certification>} certificate_list
 */

const {
    // CertificateNotFoundError,
    // CertificateError,
    // CreateCertificationError,
    // UpdateCertificationError,
    // ErrorWithCode,
    // ERRORS,
    QueryResultError
} = require("../error");
const {
    isPatientAvailableFor,
    checkUserName,
    checkPatient
} = require("./_misc");

/**
 * 
 * @param {Buffer} buffer 
 */
function buffer2Sequence(buffer) {
    return Array.from(buffer).map(x => {
        var b = String(x);
        return '\\\\' + (b.length == 1 ? '00' : (b.length == 2 ? '0' : '')) + b;
    }).join('');
}

/**
 * 
 * @param {String} sequence
 * @param {'escape'|'hex'} [encoding='escape']
 * @returns 
 */
function sequence2Buffer(sequence, encoding = 'escape') {
    const array = Array.from(sequence.split(encoding == 'hex' ? '\\x' : '\\\\'));
    array.shift();
    return Buffer.from(array);
}

// /**
//  * Get the vaccine certification list.
//  * @param {import('pg').Client} client 
//  * @param {String} username 
//  * @param {Number} vaccinePatientId 
//  */
// async function getCertification(client, username, vaccinePatientId) {
//     try {
//         await client.query('BEGIN');

//         let checkUser = await checkUserName(client, username);
//         if (!checkUser) throw null;

//         let checkPatient = await isPatientAvailableFor(
//             client,
//             vaccinePatientId,
//             Number(checkUser.person.id)
//         );
//         if (!checkPatient) throw null;

//         let cert = await client.query(
//             'SELECT * FROM certification WHERE vaccine_patient_id = $1',
//             [
//                 Number(vaccinePatientId)
//             ]
//         );

//         if (cert.rows.length == 0) [];

//         /** @type {Array<CertificationBody>} */
//         let result = [...cert.rows];

//         await client.query('COMMIT');

//         return result;
//     } catch (error) {
//         // ;
//         await client.query('ROLLBACK');
//         throw QueryResultError.unexpected();
//     }
// }

// /**
//  * Get the available vaccination for submitting the certificate of vaccination.
//  * @param {import('pg').Client} client 
//  * @param {String} username 
//  * @param {Number} vaccinePatientId 
//  */
// async function getAvailableVaccination(client, username, vaccinePatientId) {
//     try {
//         await client.query('BEGIN');

//         let checkUser = await checkUserName(client, username);
//         if (!checkUser) throw null;


//         let _checkPatient = await checkPatient(
//             client,
//             Number(vaccinePatientId),
//             Number(checkUser.person.id)
//         );

//         if (!_checkPatient) throw null;

//         let rec = await client.query(
//             `SELECT * FROM vaccine_record WHERE id = $1`,
//             [
//                 Number(_checkPatient.id)
//             ]
//         );

//         let cert = await client.query(
//             `SELECT vaccine_against FROM certification WHERE vaccine_patient_id = $1`,
//             [
//                 Number(_checkPatient.id)
//             ]
//         );

//         if (rec.rows.length != 1) return [];

//         /** @type {import('./records').VaccineRecord} */
//         let record = { ...rec.rows[0] };

//         /** @type {Array<String>} */
//         let result = [];
//         for (let n in record) {
//             if (record[n] !== null && n !== 'id' && !cert.rows.find(k => k.vaccine_against == n))
//                 result.push(n);
//         }

//         await client.query('COMMIT');

//         return result;
//     } catch (error) {
//         await client.query('ROLLBACK');
//         throw QueryResultError.unexpected();
//     }
// }

// /**
//  * Create the certification of vaccination programme.
//  * @param {import('pg').Client} client 
//  * @param {String} username 
//  * @param {CertificationCreatingContext} context
//  */
// async function createCertification(client, username, context) {
//     try {
//         const CERTIFICATE_CREATING_FAILED = new QueryResultError('CERTIFICATE_CREATING_FAILED');

//         await client.query('BEGIN');

//         let checkUser = await checkUserName(client, username);
//         if (!checkUser) throw null;


//         let _checkPatient = await checkPatient(
//             client,
//             Number(context.patient_id),
//             Number(checkUser.person.id)
//         );

//         if (!_checkPatient) throw null;

//         let cert = await client.query(
//             `INSERT INTO certification (vaccine_against,vaccine_patient_id) VALUES($1,$2)
//                 RETURNING *
//             `,
//             [
//                 String(context.against),
//                 Number(context.patient_id)
//             ]
//         );

//         if (cert.rowCount == 0 && cert.rows.length == 0) throw CERTIFICATE_CREATING_FAILED;
//         await client.query('COMMIT');
//         /** @type {CertificationBody} */
//         let result = { ...cert.rows[0] };

//         return result;
//     } catch (error) {
//         await client.query('ROLLBACK');
//         throw QueryResultError.unexpected(error);
//     }
// }

// /**
//  * Get a briefly vaccine certification list.
//  * @param {import('pg').Client} client 
//  * @param {String} username 
//  * @param {Number} vaccinePatientId 
//  */
// async function getBrieflyCertificationList(client, username, vaccinePatientId) {
//     try {
//         await client.query('BEGIN');

//         let checkUser = await checkUserName(client, username);
//         if (!checkUser) throw null;

//         let checkPatient = await isPatientAvailableFor(
//             client,
//             vaccinePatientId,
//             Number(checkUser.person.id)
//         );
//         if (!checkPatient) throw null;

//         let cert = await client.query(
//             'SELECT vaccine_against,id FROM certification WHERE vaccine_patient_id = $1',
//             [
//                 Number(vaccinePatientId)
//             ]
//         );

//         // if (cert.rows.length == 0) throw ERRORS.CERTIFICATION_NOT_FOUND;

//         /** @type {Array<CertificationBriefing>} */
//         let result = [...cert.rows];

//         await client.query('COMMIT');

//         return result;
//     } catch (error) {
//         await client.query('ROLLBACK');
//         throw QueryResultError.unexpected();
//     }
// }

// /**
//  * View an item of vaccine certification.
//  * 
//  * @param {import('pg').Client} client 
//  * @param {String} username 
//  * @param {CertificationSelectingContext} selection 
//  */
// async function viewCertificate(client, username, selection) {
//     try {
//         await client.query('BEGIN');

//         let checkUser = await checkUserName(client, username);
//         if (!checkUser) throw null;

//         let checkPatient = await isPatientAvailableFor(
//             client,
//             selection.patient_id,
//             Number(checkUser.person.id)
//         );
//         if (!checkPatient) throw null;

//         let cert = await client.query(
//             `SELECT 
//                 id,
//                 vaccine_patient_id,
//                 vaccine_briefing,
//                 vaccine_against,
//                 vaccine_manufacturer
//                 vaccine_batch_number,
//                 encode(clinician_signature,'base64') AS clinician_signature,
//                 clinician_prof_status,
//                 certify_from,
//                 certify_to,
//                 encode(administring_centre_stamp, 'base64') AS administring_centre_stamp
//             FROM certification WHERE vaccine_patient_id = $1 AND id = $2`,
//             [
//                 Number(selection.patient_id),
//                 Number(selection.certificate_id)
//             ]
//         );

//         let certHeader = await client.query(
//             `SELECT
//                 fullname_in_cert,
//                 sex,
//                 nationality,
//                 encode(signature, 'base64') as signature,
//                 against_description,
//                 date_of_birth
//              FROM vaccine_patient
//                 WHERE id = $1
//             `,
//             [
//                 Number(patient_id)
//             ]
//         );

//         if (certHeader.rows.length != 1) return {};

//         /** @type {CertificationHeader} */
//         let result = { ...certHeader.rows[0] };

//         await client.query('COMMIT');

//         return result;
//     } catch (error) {

//         await client.query('ROLLBACK');
//         throw QueryResultError.unexpected();
//     }
// }

// /**
//  * Edit the item of vaccine certification.
//  * @param {import('pg').Client} client 
//  * @param {String} username 
//  * @param {CertificationBody} certificate 
//  */
// async function editCertificate(client, username, certificate) {
//     try {
//         const CERTIFICATE_MODIFYING_FAILED = new QueryResultError('CERTIFICATE_MODIFYING_FAILED');
//         await client.query('BEGIN');

//         let cert = { ...certificate };

//         let checkUser = await checkUserName(client, username);
//         if (!checkUser) throw null;

//         let checkPatient = await isPatientAvailableFor(
//             client,
//             Number(certificate.vaccine_patient_id),
//             Number(checkUser.person.id)
//         );

//         if (!checkPatient) throw null;

//         let tableNames = Object.keys(cert).filter(x => x != 'id' && x != 'vaccine_patient_id');
//         let values = [...Object.values(cert), Number(cert)];
//         let i = 1;
//         let certUpdated = await client.query(
//             `UPDATE certification SET ${tableNames.map(x => `${x} = ${x == 'adminstring_centre_stamp' || x == 'clinician_signature' ?
//                 `decode($${i++},'base64')` :
//                 '$' + i++
//                 }`).join(',')} WHERE id = $${i}
//             RETURNING ${tableNames.map(
//                     x => x == 'clinician_signature' || x == 'administring_centre_stamp' ?
//                         `encode(${x}, 'base64') AS ${x}` : x).join(',')}`,
//             values
//         );

//         if (certUpdated.rowCount != 1 || certUpdated.rowCount != 1) throw CERTIFICATE_MODIFYING_FAILED;

//         /** @type {CertificationBody} */
//         let result = certUpdated.rows[0];

//         await client.query('COMMIT');

//         return result;
//     } catch (error) {
//         // ;
//         await client.query('ROLLBACK');
//         throw QueryResultError.unexpected(error);
//     }
// }
// /**
//  * Get the full vaccine certification information. 
//  * @param {import('pg').Client} client 
//  * @param {String} username 
//  * @param {CertificationFilteringContext} selection
//  */
// async function getDetailedCertificationList(client, username, selection) {
//     try {
//         await client.query('BEGIN');

//         let checkUser = await checkUserName(client, username);
//         if (!checkUser) null;

//         let checkPatient = await isPatientAvailableFor(
//             client,
//             selection.patient_id,
//             Number(checkUser.person.id)
//         );
//         if (!checkPatient) throw null;

//         let cert = await client.query(
//             `SELECT 
//                 id,
//                 vaccine_patient_id,
//                 vaccine_briefing,
//                 vaccine_against,
//                 vaccine_manufacturer,
//                 vaccine_batch_number,
//                 encode(clinician_signature,'base64') AS clinician_signature,
//                 clinician_prof_status,
//                 certify_from,
//                 certify_to,
//                 encode(administring_centre_stamp, 'base64') AS administring_centre_stamp
//             FROM certification WHERE vaccine_patient_id = $1`,
//             [
//                 Number(selection.patient_id),
//             ]
//         );

//         if (cert.rows.length == 0) return {};

//         let certHeader = await client.query(
//             `SELECT
//                 fullname_in_cert,
//                 sex,
//                 nationality,
//                 encode(signature, 'base64') as signature,
//                 against_description,
//                 date_of_birth
//              FROM vaccine_patient
//                 WHERE id = $1
//             `,
//             [
//                 Number(selection.patient_id)
//             ]
//         );

//         if (certHeader.rows.length != 1) return {};

//         /** @type {FullCertificate} */
//         let result = {
//             header: certHeader.rows[0],
//             list: cert.rows,
//         };

//         await client.query('COMMIT');

//         return result;
//     } catch (error) {
//         await client.query('ROLLBACK');
//         throw QueryResultError.unexpected();
//     }
// }

// /**
//  * 
//  * @param {import('pg').Client} client 
//  * @param {String} username 
//  * @param {Number} patient_id 
//  */
// async function viewCertificateHeader(client, username, patient_id) {
//     // 
//     try {
//         await client.query('BEGIN');

//         let checkUser = await checkUserName(client, username);
//         if (!checkUser) throw null;

//         let checkPatient = await isPatientAvailableFor(
//             client,
//             Number(patient_id),
//             Number(checkUser.person.id)
//         );
//         if (!checkPatient) throw null;

//         let certHeader = await client.query(
//             `SELECT
//                 fullname_in_cert,
//                 sex,
//                 nationality,
//                 encode(signature, 'base64') as signature,
//                 against_description,
//                 date_of_birth
//              FROM vaccine_patient
//                 WHERE id = $1
//             `,
//             [
//                 Number(patient_id)
//             ]
//         );

//         if (certHeader.rows.length != 1) return {};

//         /** @type {CertificationHeader} */
//         let result = { ...certHeader.rows[0] };

//         await client.query('COMMIT');

//         return result;
//     } catch (error) {
//         await client.query('ROLLBACK');
//         throw QueryResultError.unexpected();
//     }
// }

// /**
//  * 
//  * @param {import('pg').Client} client 
//  * @param {String} username 
//  * @param {CertHeaderEditingContext} context 
//  */
// async function editCertificateHeader(client, username, context) {
//     try {
//         const CERTIFICATE_HEADER_MODIFYING_FAILED = new QueryResultError('CERTIFICATE_HEADER_MODIFYING_FAILED');
//         await client.query('BEGIN');

//         let checkUser = await checkUserName(client, username);
//         if (!checkUser) throw null;

//         let checkPatient = await isPatientAvailableFor(
//             client,
//             Number(context.patient_id),
//             Number(checkUser.person.id)
//         );
//         if (!checkPatient) throw null;

//         let keys = [];
//         let values = [];

//         let i = 1;
//         for (let name in context) {
//             if (
//                 name == 'sex'
//                 || name == 'nationality'
//                 || name == 'against_description'
//                 || name == 'signature'
//                 || name == 'fullname_in_cert'
//                 || name == 'date_of_birth'
//             ) {
//                 keys.push(name);
//                 values.push(context[name]);
//             }
//         }
//         values.push(Number(context.patient_id));

//         let tableContext = keys.map(x => `${x} = ${x == 'signature' ? `decode($${i++}, 'base64')` : `$${i++}`}`).join(',');
//         let returningContext = keys.map(x => x == 'signature' ? `encode(${x}, 'base64') AS ${x}` : x).join(',');

//         let certHeader = await client.query(
//             `UPDATE vaccine_patient 
//                 SET ${tableContext}
//                 WHERE id = $${i}
//                 RETURNING ${returningContext}
//             `,
//             values
//         );

//         if (certHeader.rowCount != 1 || certHeader.rows.length != 1) throw CERTIFICATE_HEADER_MODIFYING_FAILED;

//         /** @type {CertificationHeader} */
//         let result = certHeader.rows[0];

//         await client.query('COMMIT');

//         return result;
//     } catch (error) {
//         await client.query('ROLLBACK');
//         throw QueryResultError.unexpected(error);
//     }
// }

/**
 * Get the briefy certificate. Including the certificate's owner information and the list of certification.
 * 
 * @function
 * @param {import('pg').Client} client PostgreSQL client instance.
 * @param {String} username Client's username as a string.
 * @param {Number} patient_id The id of patient as a number.
 * 
 * @returns {Promise<ViewOfBreifyCertificate>}
 */
async function viewBriefyCertificate(client, username, patient_id) {
    try {

        let checkUser = await checkUserName(client, username);
        if (!checkUser) throw null;

        let checkPatient = await isPatientAvailableFor(
            client,
            patient_id,
            Number(checkUser.person.id)
        );
        if (!checkPatient) throw null;

        let cert = await client.query(
            `SELECT id,vaccine_against FROM certification WHERE vaccine_patient_id = $1`,
            [
                Number(patient_id),
            ]
        );

        let certHeader = await client.query(
            `SELECT
                fullname_in_cert,
                sex,
                nationality,
                encode(signature,'escape') AS signature,
                against_description,
                date_of_birth
             FROM vaccine_patient WHERE id = $1
            `,
            [
                Number(patient_id),
            ]
        );

        if (certHeader.rows.length != 1) return {};


        const header = certHeader.rows[0];

        if (typeof header.signature == 'string') {
            header.signature = sequence2Buffer(header.signature);
        }

        /** @type {ViewOfBreifyCertificate} */
        const result = {
            ...header,
            certificate_list: [...cert.rows],
        };

        return result;
    } catch (error) {
        throw QueryResultError.unexpected(error);
    }
}

/**
 * Edit the item of vaccine certification.
 * @param {import('pg').Client} client 
 * @param {String} username 
 * @param {ViewOfCertificate} certificate 
 */
async function editCertificate(client, username, certificate) {
    try {
        const CERTIFICATE_MODIFYING_FAILED = new QueryResultError('CERTIFICATE_MODIFYING_FAILED');
        await client.query('BEGIN');

        let checkUser = await checkUserName(client, username);
        if (!checkUser) throw null;

        let checkPatient = await isPatientAvailableFor(
            client,
            Number(certificate.vaccine_patient_id),
            Number(checkUser.person.id)
        );

        if (!checkPatient) throw null;

        const certHeader = {};
        for (let n of ['fullname_in_cert', 'sex', 'nationality', 'against_description', 'signature']) {
            if (n in certificate) {
                switch (n) {
                    case 'signature':
                        certHeader[n] = buffer2Sequence(certificate[n]);
                        break;
                    case 'sex':
                        certHeader[n] = Number(certificate[n]);
                        break;
                    default:
                        certHeader[n] = certificate[n];
                        break;
                }

            }
        }

        let i = 0;
        const queryCtx = `UPDATE vaccine_patient SET ${Object.keys(certHeader).map((x) => `${x} = $${++i}`).join(',')} 
        WHERE id = $${++i} RETURNING ${Object.keys(certHeader)}`;
        const certHeaderEdit = await client.query(queryCtx,
            [
                ...Object.values(certHeader),
                Number(certificate.vaccine_patient_id)
            ]
        );

        if (certHeaderEdit.rowCount != 1 || certHeaderEdit.rows.length != 1) throw CERTIFICATE_MODIFYING_FAILED;

        /** @type {ViewOfCertificate} */
        let result = { ...certHeaderEdit.rows[0], };



        if (certificate.certificate_list instanceof Array) {

            for (let v of certificate.certificate_list) {
                let i = 0;
                const queryCtx = `UPDATE certification SET ${Object.keys(v).filter(x => x != 'id').map(x => `${x} = $${++i}`).join(',')
                    } WHERE id = $${i} RETURNING *`;
                const values = [
                    ...Object.entries(v).map(x =>
                        x[0] == 'clinician_signature' || x[0] == 'administring_centre_stamp' && x[1] instanceof Buffer
                            ? buffer2Sequence(x[1]) : x[1]
                    ),
                    Number(v.id)
                ];

                console.log(queryCtx, values);
                const certUpdate = await client.query(queryCtx, [
                    ...Object.entries(v).map(x =>
                        x[0] == 'clinician_signature' || x[0] == 'administring_centre_stamp' && x[1] instanceof Buffer
                            ? buffer2Sequence(x[1]) : x[1]
                    ),
                    Number(v.id)
                ]);
                if (certUpdate.rowCount != 1 || certUpdate.rows.length != 1) {
                    throw CERTIFICATE_MODIFYING_FAILED;
                }

                if ('certificate_list' in result) result.certificate_list = [];

                result.certificate_list.push({
                    ...Object.entries(certUpdate.rows[0]).map(x =>
                        x[0] == 'clinician_signature' || x[0] == 'administring_centre_stamp'
                            ? sequence2Buffer(x[1]) : x[1]
                    ),
                });
            }
        }

        await client.query('COMMIT');

        return result;
    } catch (error) {
        console.log(error);
        await client.query('ROLLBACK');
        throw QueryResultError.unexpected(error);
    }
}


/**
 * Get the available vaccination for submitting the certificate of vaccination.
 * @param {import('pg').Client} client 
 * @param {String} username 
 * @param {Number} vaccinePatientId 
 */
async function getAvailableVaccination(client, username, vaccinePatientId) {
    try {
        let checkUser = await checkUserName(client, username);
        if (!checkUser) throw null;


        let _checkPatient = await checkPatient(
            client,
            Number(vaccinePatientId),
            Number(checkUser.person.id)
        );

        if (!_checkPatient) throw null;

        let rec = await client.query(
            `SELECT * FROM vaccine_record WHERE id = $1`,
            [
                Number(_checkPatient.vaccine_record_id)
            ]
        );

        let cert = await client.query(
            `SELECT vaccine_against FROM certification WHERE vaccine_patient_id = $1`,
            [
                Number(_checkPatient.id)
            ]
        );

        if (rec.rows.length != 1) return [];

        /** @type {import('./records').VaccineRecord} */
        let record = { ...rec.rows[0] };

        /** @type {String[]} */
        let result = [];

        for (let c of cert.rows) {
            delete record[c.vaccine_against];
        }

        for (let n in record) {
            if (record[n] !== null && n != 'id') result.push(n);
        }

        return result;
    } catch (error) {
        throw QueryResultError.unexpected();
    }
}

/**
 * Create the certification of vaccination programme.
 * @param {import('pg').Client} client 
 * @param {String} username 
 * @param {Number} patient_id
 * @param {String[]} vaccine_against_list
 */
async function createCertification(client, username, patient_id, vaccine_against_list) {
    try {
        const CERTIFICATE_CREATING_FAILED = new QueryResultError('CERTIFICATE_CREATING_FAILED');

        await client.query('BEGIN');

        let checkUser = await checkUserName(client, username);
        if (!checkUser) throw null;


        let _checkPatient = await checkPatient(
            client,
            Number(patient_id),
            Number(checkUser.person.id)
        );

        if (!_checkPatient || !(vaccine_against_list instanceof Array)) throw null;

        let i = 0;
        let queryCtx = `INSERT INTO certification (vaccine_patient_id,vaccine_against) VALUES ${vaccine_against_list.map(() => `($${++i},$${++i})`).join(',')
            } RETURNING *`;

        const values = [];
        for (let s of vaccine_against_list) {
            values.push(Number(patient_id), String(s));
        }
        let cert = await client.query(
            queryCtx,
            values
        );

        if (cert.rowCount == 0 && cert.rows.length == 0) throw CERTIFICATE_CREATING_FAILED;
        await client.query('COMMIT');
        /** @type {Certification} */
        let result = { ...cert.rows[0] };

        return result;
    } catch (error) {
        await client.query('ROLLBACK');
        throw QueryResultError.unexpected(error);
    }
}

/**
 * View an item of vaccine certification.
 * 
 * @param {import('pg').Client} client 
 * @param {String} username 
 * @param {Number} vaccine_patient_id 
 * @param {Number} certificate_id
 */
async function viewEachCertification(client, username, vaccine_patient_id, certificate_id) {
    try {

        let checkUser = await checkUserName(client, username);
        if (!checkUser) throw null;

        let checkPatient = await isPatientAvailableFor(
            client,
            vaccine_patient_id,
            Number(checkUser.person.id)
        );

        if (!checkPatient) throw null;

        let cert = await client.query(
            `SELECT 
                id,
                vaccine_patient_id,
                vaccine_name,
                vaccine_against,
                vaccine_manufacturer,
                vaccine_batch_number,
                encode(clinician_signature,'escape') AS clinician_signature,
                clinician_prof_status,
                certify_from,
                certify_to,
                encode(administring_centre_stamp, 'escape') AS administring_centre_stamp
            FROM certification WHERE vaccine_patient_id = $1 AND id = $2`,
            [
                Number(vaccine_patient_id),
                Number(certificate_id)
            ]
        );

        if (cert.rows.length != 1) {
            return null;
        }

        /** @type {Certification} */
        let result = { ...cert.rows[0] };

        for (let n of ['clinician_signature', 'administring_centre_stamp']) {
            if (typeof result[n] == 'string') {
                result[n] = sequence2Buffer(result[n]);
            }
        }

        return result;
    } catch (error) {
        throw QueryResultError.unexpected();
    }
}

module.exports = {
    // getCertification,
    // getAvailableVaccination,
    // createCertification,
    // getBrieflyCertificationList,
    // viewCertificate,
    // editCertificate,
    // getDetailedCertificationList,
    // viewCertificateHeader,
    // editCertificateHeader,
    viewBriefyCertificate,
    editCertificate,
    getAvailableVaccination,
    createCertification,
    viewEachCertification,
};