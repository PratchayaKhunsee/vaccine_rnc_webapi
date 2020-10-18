/**
 * @typedef {Object} Certification
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
 * @typedef {Object} CertificationCreatingContext
 * @property {Number} patient_id
 * @property {String} against
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
            `SELECT vaccine_against FROM certifaction WHERE vaccine_patient_id = $1`,
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
            if (record[n] !== null && n !== 'id' && !cert.rows.find(k => k == n)) result.push(n);
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

module.exports = {
    doCreateCertification,
    doEditCertification,
    doViewCertifications,
    getCertification,
    getAvailableVaccination,
    createCertification
};