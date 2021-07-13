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
 */

const {
    QueryResultError
} = require("../error");
const {
    checkUserName,
    isRecordAvailableFor,
} = require("./_misc");

// /**
//  * @private
//  * @param {import("../database").PgQueryMethod} client
//  * @param {Number} vaccinePatientID 
//  */
// async function viewRecords(client, vaccinePatientID) {
//     try {
//         await client('begin');
//         let patient = await client(
//             'select * from vaccine_patient where id = $1',
//             [Number(vaccinePatientID)]
//         );

//         if (patient.rows.length != 1) {
//             throw new PatientNotFoundError(Number(vaccinePatientID));
//         }

//         let records = await client(
//             'select * from vaccine_record where id = $1',
//             [Number(patient.rows[0].vaccine_record_id)]
//         );

//         if (records.rows.length == 0) {
//             throw VaccineRecordNotFoundError(Number(vaccinePatientID));
//         }

//         let returned = records.rows.map(x => ({ ...x }));

//         await client('commit');
//         return returned;
//     } catch (err) {
//         await client('rollback');
//         return new RecordError(err);
//     }
// }

// /**
//  * @private
//  * @param {import("../database").PgQueryMethod} client
//  * @param {Number} vaccinePatientID 
//  */
// async function createRecord(client, vaccinePatientID) {
//     try {
//         await client('begin');

//         let created = await client(
//             `insert into vaccine_record retuning id`
//         );

//         if (created.rowCount == 0) {
//             throw new CreateEmptyRecordError();
//         }

//         if (0 in arguments) {
//             let update = await client(
//                 `update vaccine_patient set (vaccine_record_id = $1) where id = $2`,
//                 [
//                     Number(created.rows[0].id),
//                     Number(vaccinePatientID)
//                 ]
//             );

//             if (update.rowCount == 0) {
//                 throw new UpdateRecordIDForPatientError(Number(vaccinePatientID));
//             }
//         }

//         await client('commit');

//         return 1;
//     } catch (error) {
//         await client('rollback');
//         return new RecordError(error);
//     }
// }

// /**
//  * @private
//  * @param {import("../database").PgQueryMethod} client
//  * @param {VaccinationProgram} program 
//  * @param {Number} vaccineRecordID 
//  */
// async function createVaccinationProgram(client, program, vaccineRecordID) {
//     // if (!(program && program.against && program.age && program.age.first)) {
//     //     return 'MissingRequiredDataError';
//     // }

//     try {
//         await client('begin');
//         let vaccineProgram = await client(
//             `insert into vaccine_record_extended (vaccine_record_id,against,description,age_first,age_second,age_third) values($1,$2,$3,$4,$5,$6)`,
//             [
//                 Number(vaccineRecordID),
//                 program.against,
//                 program.description || null,
//                 Number(program.age.first),
//                 Number(program.age.second) || null,
//                 Number(program.age.third) || null,
//             ]
//         );

//         if (vaccineProgram.rowCount == 0) {
//             throw new CreateVaccinationProgramError(Number(vaccineRecordID));
//         }

//         await client('commit');
//         return 1;
//     } catch (error) {
//         await client('rollback');
//         return new RecordError(error);
//     }
// }

// /**
//  * @private
//  * @param {import("../database").PgQueryMethod} q
//  * @param {Vaccine} vaccineData
//  * @param {Number} vaccineRecordID
//  * @param {VaccinationRecord} vaccineRecordData
//  */
// async function vaccinate(client, vaccineData, vaccineRecordID, vaccineRecordData) {
//     try {
//         await client('begin');

//         let vaccineValues = [];
//         let vaccineKeys = Object.keys(vaccineData);
//         let i = 1;
//         Array.prototype.push.apply(vaccineValues, Object.values(vaccineData));
//         let createdVaccine = await client(
//             `insert into vaccine ${vaccineData ? `(${vaccineKeys.join(',')})` : ''
//             } ${vaccineData ? `values(${vaccineKeys.map(() => '$' + i++).join(',')})` : ''
//             } returning id`,
//             vaccineValues
//         );

//         if (createdVaccine.rowCount == 0) {
//             throw new CreateVaccineError();
//         }

//         let rData = {
//             ...vaccineRecordData
//         }
//         if (rData.period) {
//             r.against = ({
//                 1: 'first',
//                 2: 'second',
//                 3: 'third'
//             })[rData.against] || '_';
//         }
//         let updatedVaccineRecord = await client(
//             `update from vaccine_record set (${rData.against}_${rData.period} = $1,vaccine_id_${rData.against}_${rData.period} = $2) where id = $3`,
//             [
//                 rData.date,
//                 Number(createdVaccine.rows[0].id),
//                 Number(vaccineRecordID)
//             ]
//         );

//         if (updatedVaccineRecord.rowCount == 0) {
//             let extendedVaccineRecord = await client(
//                 `update from vaccine_record_extended set(${rData.period} = $1) where vaccine_record_id = $2 && against = $3`,
//                 [
//                     rData.date,
//                     Number(vaccineRecordID),
//                     rData.against
//                 ]
//             );

//             if (extendedVaccineRecord.rowCount == 0) {
//                 throw new UpdateVaccinationError();
//             }
//         }

//         await client('commit');

//         return 1;
//     } catch (error) {
//         await client('rollback');
//         return new RecordError(error);
//     }
// }

// /**
//  * 
//  * @param {import('pg').Client} client 
//  * @param {String} username
//  * @param {VaccinatonRecordIdentifier} identifier
//  */
// async function getVaccination(client, username, identifier) {
//     try {
//         await client.query('BEGIN');

//         let vacDate = await client.query('');
//         await client.query('COMMIT');
//     } catch (error) {
//         await client.query('ROLLBACK');
//         return error;
//     }
// }

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

        if (record.rows.length == 0){
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
 * @param {VaccineRecord} details 
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
    // doViewRecords,
    // doCreateRecord,
    // doCreateVaccinationProgram,
    // doVaccination,
    viewRecord,
    createRecord,
    editRecord
};