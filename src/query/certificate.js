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
 * @property {Buffer|String} administring_centre_stamp
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
        console.log(error);
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
                    } WHERE id = $${++i} RETURNING *`;

                const values = [
                    ...Object.entries(v).filter(x => x[0] != 'id').map(x =>
                        (x[0] == 'clinician_signature' || x[0] == 'administring_centre_stamp') && x[1] instanceof Buffer
                            ? buffer2Sequence(x[1]) : x[1]
                    ),
                    Number(v.id)
                ];

                console.log(queryCtx, values, v);

                const certUpdate = await client.query(queryCtx, values);
                if (certUpdate.rowCount != 1 || certUpdate.rows.length != 1) {
                    throw CERTIFICATE_MODIFYING_FAILED;
                }

                if (!(result.certificate_list instanceof Array)) result.certificate_list = [];

                result.certificate_list.push({
                    ...Object.entries(certUpdate.rows[0]).map(x =>
                        x[0] == 'clinician_signature' || x[0] == 'administring_centre_stamp'
                            ? (x[1] == null ? null : sequence2Buffer(x[1])) : x[1]
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

        for (let n of ['certify_from', 'certify_to']) {

            if (result[n]) result[n] = new Date(result[n]).toISOString();
        }



        return result;
    } catch (error) {
        throw QueryResultError.unexpected();
    }
}

/**
 * Get the full vaccine certification information. 
 * @param {import('pg').Client} client 
 * @param {String} username 
 * @param {Number} patient_id
 */
async function getCompleteCertification(client, username, patient_id) {
    try {

        let checkUser = await checkUserName(client, username);
        if (!checkUser) null;

        let checkPatient = await isPatientAvailableFor(
            client,
            Number(patient_id),
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
            FROM certification WHERE vaccine_patient_id = $1`,
            [
                Number(patient_id),
            ]
        );

        if (cert.rows.length == 0) return null;

        let certHeader = await client.query(
            `SELECT
                fullname_in_cert,
                sex,
                nationality,
                encode(signature, 'escape') as signature,
                against_description,
                date_of_birth
             FROM vaccine_patient
                WHERE id = $1
            `,
            [
                Number(patient_id)
            ]
        );

        /** @type {ViewOfCertificate} */
        let result = {
            ...certHeader.rows[0],
            certificate_list: cert.rows,
        };

        if(result.signature !== null){
            result.signature = sequence2Buffer(result.signature, 'escape');
        }
        if (result.certificate_list instanceof Array) {
            for (let r of result.certificate_list) {
                if (r.clinician_signature !== null) {
                    r.clinician_signature = sequence2Buffer(r.clinician_signature, 'escape');
                }
                
                if (r.administring_centre_stamp !== null) {
                    r.administring_centre_stamp = sequence2Buffer(r.administring_centre_stamp, 'escape');
                }
            }
        }

        return result;
    } catch (error) {
        console.log(error);
        throw QueryResultError.unexpected();
    }
}

module.exports = {
    viewBriefyCertificate,
    editCertificate,
    getAvailableVaccination,
    createCertification,
    viewEachCertification,
    getCompleteCertification,
};