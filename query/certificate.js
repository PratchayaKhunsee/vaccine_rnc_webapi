/**
 * @typedef {Object} Certification
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
 * @typedef {Object} CertificationData
 * @property {Number} [vaccine_id]
 * @property {Number} [person_id]
 * @property {String} [clinician_signature]
 * @property {String} [clinician_prof_status]
 * @property {String} [certify_from]
 * @property {String} [certify_to]
 * @property {String} [adminstering_centre_stamp]
 */

const {
    CertificateNotFoundError,
    CertificateError,
    CreateCertificationError,
    UpdateCertificationError,
    ErrorWithCode,
    ERRORS
} = require("../error");
const {
    isPatientAvailableFor,
    checkUserName,
    checkPatient
} = require("./_misc");

/**
 * @param {import("../database").PgQueryMethod} q
 * @param {Number} personID 
 */
async function doViewCertifications(q, personID) {
    try {
        await q('begin');
        let certs = await q(
            `select * from certification where person_id = $1`,
            [
                Number(personID)
            ]
        );
        if (certs.rows.length == 0) {
            throw new CertificateNotFoundError(Number(personID));
        }

        await q('commit');
        return certs.rows.map(x => {
            let cloned = {
                ...x
            };
            for (let name in cloned) cloned[name.replace(/_\w/g, d => d[1].toUpperCase())] = cloned[name];
            return x;
        });
    } catch (error) {
        await q('rollback');
        return new CertificateError(error);
    }
}

/**
 * @param {import("../database").PgQueryMethod} q
 * @param {Number} personID
 * @param {Number} vaccineID
 * @param {CertificationData} [data]
 */
async function doCreateCertification(q, personID, vaccineID, data) {
    try {
        await q('begin');
        let cloned = {
            ...(data)
        };
        for (let name in cloned) {
            if (name == 'vaccine_id' || name == 'person_id') delete cloned[name];
        }
        let keys = Object.keys(cloned);
        let values = [
            Number(vaccineID),
            Number(personID)
        ];
        Array.prototype.push.apply(values, Object.values(cloned));
        let i = 3;
        let certification = await q(
            `insert into certification (vaccine_id,person_id${keys.length > 0 ? ',' + keys.join(',') : ''
            }) values ($1,$2${keys.length > 0 ? ',' + keys.map(() => '$' + i++).join(',') : ''
            })`,
            values
        );

        if (certification.rowCount == 0) {
            throw new CreateCertificationError(Number(personID));
        }

        await q('commit');
        return 1;
    } catch (error) {
        await q('rollback');
        return new CertificateError(error);
    }
}

/**
 * @param {import("../database").PgQueryMethod} q
 * @param {Number} certificationID
 * @param {Number} personID
 * @param {CertificationData} data
 */
async function doEditCertification(q, certificationID, personID, data) {
    try {
        await q('begin');
        let cloned = {
            ...data
        };
        for (let name in cloned) {
            if (name == 'vaccine_id' || name == 'person_id') delete cloned[name];
        }
        let keys = Object.keys(cloned);
        let values = [
            Number(certificationID),
            Number(personID)
        ];
        let i = 1;
        Array.prototype.unshift.apply(values, Object.values(cloned));
        let updated = await q(
            `update certification set(${keys.map(x => x + ' = ' + i++).join(',')}) where id = $${i++} and person_id = $${i}`,
            values
        );

        if (updated.rowCount == 0) {
            throw new UpdateCertificationError(Number(certificationID));
        }

        await q('commit');
    } catch (error) {
        await q('rollback');
        return new CertificateError(error);
    }
}

/**
 * 
 * @param {import('pg').Client} client 
 * @param {String} username 
 * @param {Number} vaccinePatientId 
 */
async function getCertification(client, username, vaccinePatientId) {
    try {
        await client.query('BEGIN');

        let checkUser = await checkUserName(client, username);
        if (!checkUser) throw ERRORS.USER_NOT_FOUND;

        let checkPatient = await isPatientAvailableFor(
            client,
            vaccinePatientId,
            Number(checkUser.person.id)
        );
        if (!checkPatient) throw ERRORS.PATIENT_NOT_FOUND;

        let cert = await client.query(
            'SELECT * FROM certification WHERE vaccine_patient_id = $1',
            [
                Number(vaccinePatientId)
            ]
        );

        if (cert.rows.length == 0) throw ERRORS.CERTIFICATION_NOT_FOUND;

        /** @type {Array<Certification>} */
        let result = [...cert.rows];

        await client.query('COMMIT');

        return result;
    } catch (error) {
        // console.log(error);
        await client.query('ROLLBACK');
        return new ErrorWithCode(error);
    }
}

/**
 * 
 * @param {import('pg').Client} client 
 * @param {String} username 
 * @param {Number} vaccinePatientId 
 */
async function getAvailableVaccination(client, username, vaccinePatientId) {
    try {
        await client.query('BEGIN');

        let checkUser = await checkUserName(client, username);
        if (!checkUser) throw ERRORS.USER_NOT_FOUND;


        let _checkPatient = await checkPatient(
            client,
            Number(vaccinePatientId),
            Number(checkUser.person.id)
        );

        if (!_checkPatient) throw ERRORS.PATIENT_NOT_FOUND;

        let rec = await client.query(
            `SELECT * FROM vaccine_record WHERE id = $1`,
            [
                Number(_checkPatient.id)
            ]
        );

        let cert = await client.query(
            `SELECT vaccine_against FROM certification WHERE vaccine_patient_id = $1`,
            [
                Number(_checkPatient.id)
            ]
        );

        if (rec.rows.length != 1) throw ERRORS.RECORDS_NOT_FOUND;

        /** @type {import('./records').VaccineRecord} */
        let record = { ...rec.rows[0] };

        /** @type {Array<String>} */
        let result = [];
        for (let n in record) {
            if (record[n] !== null && n !== 'id' && !cert.rows.find(k => k.vaccine_against == n))
                result.push(n);
        }

        await client.query('COMMIT');

        return result;
    } catch (error) {
        await client.query('ROLLBACK');
        return new ErrorWithCode(error);
    }
}

/**
 * 
 * @param {import('pg').Client} client 
 * @param {String} username 
 * @param {CertificationCreatingContext} context
 */
async function createCertification(client, username, context) {
    try {
        await client.query('BEGIN');

        let checkUser = await checkUserName(client, username);
        if (!checkUser) throw ERRORS.USER_NOT_FOUND;


        let _checkPatient = await checkPatient(
            client,
            Number(context.patient_id),
            Number(checkUser.person.id)
        );

        if (!_checkPatient) throw ERRORS.PATIENT_NOT_FOUND;

        let cert = await client.query(
            `INSERT INTO certification (vaccine_against,vaccine_patient_id) VALUES($1,$2)
                RETURNING *
            `,
            [
                String(context.against),
                Number(context.patient_id)
            ]
        );

        if (cert.rowCount == 0 && cert.rows.length == 0) throw ERRORS.CREATING_CERT_ERROR;
        await client.query('COMMIT');
        /** @type {Certification} */
        let result = { ...cert.rows[0] };

        return result;
    } catch (error) {
        await client.query('ROLLBACK');
        return new ErrorWithCode(error);
    }
}

/**
 * 
 * @param {import('pg').Client} client 
 * @param {String} username 
 * @param {Number} vaccinePatientId 
 */
async function getBrieflyCertificates(client, username, vaccinePatientId) {
    try {
        await client.query('BEGIN');

        let checkUser = await checkUserName(client, username);
        if (!checkUser) throw ERRORS.USER_NOT_FOUND;

        let checkPatient = await isPatientAvailableFor(
            client,
            vaccinePatientId,
            Number(checkUser.person.id)
        );
        if (!checkPatient) throw ERRORS.PATIENT_NOT_FOUND;

        let cert = await client.query(
            'SELECT vaccine_against,id FROM certification WHERE vaccine_patient_id = $1',
            [
                Number(vaccinePatientId)
            ]
        );

        if (cert.rows.length == 0) throw ERRORS.CERTIFICATION_NOT_FOUND;

        /** @type {Array<CertificationBriefing>} */
        let result = [...cert.rows];

        await client.query('COMMIT');

        return result;
    } catch (error) {
        await client.query('ROLLBACK');
        return new ErrorWithCode(error);
    }
}

/**
 * 
 * @param {import('pg').Client} client 
 * @param {String} username 
 * @param {CertificationSelectingContext} selection 
 */
async function viewCertificate(client, username, selection) {
    try {
        await client.query('BEGIN');

        let checkUser = await checkUserName(client, username);
        if (!checkUser) throw ERRORS.USER_NOT_FOUND;

        let checkPatient = await isPatientAvailableFor(
            client,
            selection.patient_id,
            Number(checkUser.person.id)
        );
        if (!checkPatient) throw ERRORS.PATIENT_NOT_FOUND;

        let cert = await client.query(
            `SELECT 
                id,
                vaccine_patient_id,
                vaccine_briefing,
                vaccine_against,
                vaccine_manufacturer
                vaccine_batch_number,
                encode(clinician_signature,'base64') AS clinician_signature,
                clinician_prof_status,
                certify_from,
                certify_to,
                encode(administring_centre_stamp, 'base64') AS administring_centre_stamp
            FROM certification WHERE vaccine_patient_id = $1 AND id = $2`,
            [
                Number(selection.patient_id),
                Number(selection.certificate_id)
            ]
        );

        if (cert.rows.length != 1) throw ERRORS.CERTIFICATION_NOT_FOUND;

        /** @type {Certification} */
        let result = cert.rows[0];

        await client.query('COMMIT');

        return result;
    } catch (error) {
        // console.log(error);
        await client.query('ROLLBACK');
        return new ErrorWithCode(error);
    }
}

/**
 * 
 * @param {import('pg').Client} client 
 * @param {String} username 
 * @param {Certification} certificate 
 */
async function editCertificate(client, username, certificate) {
    try {
        await client.query('BEGIN');

        let cert = { ...certificate };

        let checkUser = await checkUserName(client, username);
        if (!checkUser) throw ERRORS.USER_NOT_FOUND;

        let checkPatient = await isPatientAvailableFor(
            client,
            Number(certificate.vaccine_patient_id),
            Number(checkUser.person.id)
        );

        if (!checkPatient) throw ERRORS.PATIENT_NOT_FOUND;

        let tableNames = Object.keys(cert).filter(x => x != 'id' && x != 'vaccine_patient_id');
        let values = [];
        for (let k of tableNames) {
            let v = cert[k];
            // console.log(k, v);
            values.push(v);
        }
        values.push(Number(cert.id));
        let i = 1;
        let certUpdated = await client.query(
            `UPDATE certification SET ${tableNames.map(x => `${x} = ${x == 'adminstring_centre_stamp' || x == 'clinician_signature' ?
                `decode($${i++},'base64')` :
                '$' + i++
                }`).join(',')} WHERE id = $${i}
            RETURNING ${tableNames.map(
                    x => x == 'clinician_signature' || x == 'administring_centre_stamp' ?
                        `encode(${x}, 'base64') AS ${x}` : x).join(',')}`,
            values
        );

        if (certUpdated.rowCount != 1 || certUpdated.rowCount != 1) throw ERRORS.MODIFYING_CERT_ERROR;

        /** @type {Certification} */
        let result = certUpdated.rows[0];

        await client.query('COMMIT');

        return result;
    } catch (error) {
        // console.log(error);
        await client.query('ROLLBACK');
        return new ErrorWithCode(error);
    }
}
/**
 * 
 * @param {import('pg').Client} client 
 * @param {String} username 
 * @param {CertificationFilteringContext} selection
 */
async function getFullCertificates(client, username, selection) {
    try {
        await client.query('BEGIN');

        let checkUser = await checkUserName(client, username);
        if (!checkUser) throw ERRORS.USER_NOT_FOUND;

        let checkPatient = await isPatientAvailableFor(
            client,
            selection.patient_id,
            Number(checkUser.person.id)
        );
        if (!checkPatient) throw ERRORS.PATIENT_NOT_FOUND;

        let cert = await client.query(
            `SELECT 
                id,
                vaccine_patient_id,
                vaccine_briefing,
                vaccine_against,
                vaccine_manufacturer
                vaccine_batch_number,
                encode(clinician_signature,'base64') AS clinician_signature,
                clinician_prof_status,
                certify_from,
                certify_to,
                encode(administring_centre_stamp, 'base64') AS administring_centre_stamp
            FROM certification WHERE vaccine_patient_id = $1`,
            [
                Number(selection.patient_id),
            ]
        );

        if (cert.rows.length != 1) throw ERRORS.CERTIFICATION_NOT_FOUND;

        /** @type {Certification} */
        let result = cert.rows[0];

        await client.query('COMMIT');

        return result;
    } catch (error) {
        console.log(error);
        await client.query('ROLLBACK');
        return new ErrorWithCode(error);
    }
}

module.exports = {
    doCreateCertification,
    doEditCertification,
    doViewCertifications,
    getCertification,
    getAvailableVaccination,
    createCertification,
    getBrieflyCertificates,
    viewCertificate,
    editCertificate,
    getFullCertificates
};