/**
 * @typedef {String} DateString
 * 
 * @typedef {Object} VaccinationProgramAges
 * @property {Number} first
 * @property {Number} [second]
 * @property {Number} [third]
 * 
 * @typedef {Object} VaccinationProgram
 * @property {String} [description]
 * @property {String} against
 * @property {VaccinationProgramAges} age
 * 
 * @typedef {Object} Vaccine
 * @property {String} against
 * @property {String} [description]
 * @property {String} batchNumber
 * @property {String} manufacturer
 * 
 * @typedef {Object} VaccinationRecord
 * @property {String} against 
 * @property {1|2|3} period
 * @property {DateString} date
 * 
 * @typedef {'bcg'|'hb'|'opv_early'|'dtp_hb'|'ipv'|'mmr'|'je'|'opv_later'|'dtp'|'hpv'|'dt'} VaccinationProgramName
 * 
 * @typedef {Object} VaccinationRecordIdentifer
 * @property {Number} id
 * @property {VaccinationProgramName} program
 * @property {1|2|3} phase
 * 
 * @typedef {Object} VaccineRecord
 * @property {String} id
 * @property {String}  bcg_first 
 * @property {String}  hb_first 
 * @property {String}  hb_second 
 * @property {String}  opv_early_first 
 * @property {String}  opv_early_second 
 * @property {String}  opv_early_third 
 * @property {String}  dtp_hb_first 
 * @property {String}  dtp_hb_second 
 * @property {String}  dtp_hb_third 
 * @property {String}  ipv_first 
 * @property {String}  mmr_first 
 * @property {String}  mmr_second 
 * @property {String}  je_first 
 * @property {String}  je_second
 * @property {String}  opv_later_first 
 * @property {String}  opv_later_second 
 * @property {String}  dtp_first
 * @property {String}  dtp_second 
 * @property {String}  hpv_first 
 * @property {String}  dt_first
 * 
 * @typedef {Object} VaccineRecordModifier
 * @property {String} id
 * @property {String}  [bcg_first] 
 * @property {String}  [hb_first] 
 * @property {String}  [hb_second] 
 * @property {String}  [opv_early_first] 
 * @property {String}  [opv_early_second] 
 * @property {String}  [opv_early_third] 
 * @property {String}  [dtp_hb_first] 
 * @property {String}  [dtp_hb_second] 
 * @property {String}  [dtp_hb_third] 
 * @property {String}  [ipv_first] 
 * @property {String}  [mmr_first] 
 * @property {String}  [mmr_second] 
 * @property {String}  [je_first] 
 * @property {String}  [je_second]
 * @property {String}  [opv_later_first] 
 * @property {String}  [opv_later_second] 
 * @property {String}  [dtp_first]
 * @property {String}  [dtp_second] 
 * @property {String}  [hpv_first] 
 * @property {String}  [dt_first]
 */

const {
    QueryResultError
} = require("../error");
const {
    checkUserName,
    isRecordAvailableFor,
} = require("./_misc");

/**
 * View a record of vaccination book.
 * @param {import('pg').Client} client 
 * @param {String} username 
 * @param {Number} patientId 
 */
async function viewRecord(client, username, patientId) {
    try {
        await client.query('BEGIN');

        let checkUser = await checkUserName(client, username);
        if (!checkUser) throw null;

        let patient = await client.query(
            'SELECT * FROM vaccine_patient WHERE id = $1',
            [
                Number(patientId)
            ]
        );

        if (patient.rows.length != 1) throw null;

        let record = await client.query(
            `SELECT * FROM vaccine_record WHERE id = $1`,
            [
                Number(patient.rows[0].vaccine_record_id)
            ]
        );

        if (record.rows.length == 0) {
            return await createRecord(client, username, patientId);
        }

        await client.query('COMMIT');

        /** @type {VaccineRecord} */
        let result = { ...record.rows[0] };
        return result;
    } catch (error) {
        await client.query('ROLLBACK');
        return QueryResultError.unexpected(error);
    }
}

/**
 * Create a record of vaccination book.
 * @param {import('pg').Client} client 
 * @param {String} username 
 * @param {Number} patient_id 
 */
async function createRecord(client, username, patient_id) {
    try {
        const RECORD_CREATING_FAILED = new QueryResultError('RECORD_CREATING_FAILED');

        await client.query('BEGIN');

        let checkUser = await checkUserName(client, username);
        if (!checkUser) throw null;

        let patient = await client.query(
            'SELECT * FROM vaccine_patient WHERE id = $1',
            [
                Number(patient_id)
            ]
        );

        if (patient.rows.length != 1) throw RECORD_CREATING_FAILED;

        let record = await client.query(
            `INSERT INTO vaccine_record DEFAULT VALUES RETURNING *`
        );

        if (record.rowCount != 1 || record.rows.length != 1) throw RECORD_CREATING_FAILED;

        let updatePatient = await client.query(
            'UPDATE vaccine_patient SET vaccine_record_id = $1 WHERE id = $2',
            [
                Number(record.rows[0].id),
                Number(patient_id)
            ]
        );

        if (updatePatient.rowCount != 1) throw RECORD_CREATING_FAILED;

        await client.query('COMMIT');

        /** @type {VaccineRecord} */
        const result = { ...record.rows[0] };
        return result;
    } catch (error) {
        await client.query('ROLLBACK');
        throw QueryResultError.unexpected(error);
    }
}

/**
 * Edit a record of vaccination book.
 * @param {import('pg').Client} client 
 * @param {String} username 
 * @param {VaccineRecordModifier} details 
 */
async function editRecord(client, username, details) {
    try {
        const RECORD_MODIFYING_FAILED = new QueryResultError('RECORD_MODIFYING_FAILED');

        await client.query('BEGIN');

        let checkUser = await checkUserName(client, username);
        if (!checkUser) throw null;

        let available = await isRecordAvailableFor(client, Number(details.id), Number(checkUser.person.id));
        if (!available) throw RECORD_MODIFYING_FAILED;

        let i = 1;
        let keys = Object.keys(details);
        let values = [Number(details.id)];
        Array.prototype.unshift.apply(values, Object.values(details));

        let record = await client.query(
            `UPDATE vaccine_record SET ${keys.map((k => `${k} = $${i++}`))} WHERE id = $${i} RETURNING ${keys.join(',')}`,
            values
        );

        if (record.rowCount != 1 || record.rows.length != 1) throw RECORD_MODIFYING_FAILED;

        await client.query('COMMIT');

        /** @type {VaccineRecord} */
        let result = { ...record.rows[0] };
        return result;
    } catch (error) {
        await client.query('ROLLBACK');
        throw QueryResultError.unexpected(error);
    }
}

module.exports = {
    viewRecord,
    createRecord,
    editRecord
};