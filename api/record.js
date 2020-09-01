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
 */
/** @namespace */
const pool = require("../database");

module.exports = {
    viewPatient,
    editPatient,
    createPatient,
    viewRecords,
    createRecord,
    createVaccinationProgram,
    doVaccination
}

/**
 * 
 * @param {Number} vaccinePatientID
 */
async function viewPatient(vaccinePatientID) {
    try {
        await pool.query('begin');

        let vaccinePatient = await pool.query(
            'select * from vaccine_patient where id = $1',
            [Number(vaccinePatientID)]
        );

        if (vaccinePatient.rows.length != 1) {
            throw 'VaccinePatientNotFound';
        }

        let returned = {
            ...(vaccinePatient.rows[0])
        };

        await pool.query('commit');
        return returned;
    } catch (err) {
        await pool.query('rollback');
        return err;
    }
}

/**
 * @param {Number} vaccinePatientID
 * @param {Object} info
 */
async function editPatient(vaccinePatientID, info) {
    try {
        await pool.query('begin');

        let i = 1;
        let values = [Number(vaccinePatientID)];
        Array.prototype.unshift.apply(values, Object.values(info));
        let result = await pool.query(
            `update vaccine_patient set(${Object.keys(info).map(x => x + ' = $' + i++)}) where id = $${i}`,
            values
        );

        if (result.rowCount == 0) {
            throw 'EditPatientError';
        }
        await pool.query('commit');
        return result.rowCount;

    } catch (err) {
        await pool.query('rollback');
        return err;
    }
}

/**
 * @param {Object} data
 * @param {Number} [personID] 
 */
async function createPatient(data, personID) {
    try {
        await pool.query('begin');
        let values = [];
        Array.prototype.push.apply(values, Object.values(data));
        let i = 1;
        let created = await pool.query(
            `insert into vaccine_patient ${data ? `(${Object.keys(data).join(',')})` : ''} ${data ? `values(${Object.values(data).map(() => '$' + i++ ).join(',')})` : ''} retuning id`,
            values
        );

        if (created.rowCount == 0) {
            throw 'CreatedPatientError';
        }

        await pool.query('commit');

        if (1 in arguments) {
            let update = await pool.query(
                `update person set (vaccine_patient_id = $1) where id = $2`,
                [Number(created.rows[0].id), Number(personID)]
            );

            if (update.rowCount == 0) {
                throw 'UpdateBoundVaccinePatientIDError';
            }

        }

        return 1;
    } catch (error) {
        await pool.query('rollback');
        return error;
    }
}

/**
 * 
 * @param {Number} vaccinePatientID 
 */
async function viewRecords(vaccinePatientID) {
    try {
        await pool.query('begin');
        let patient = await pool.query(
            'select * from vaccine_patient where id = $1',
            [vaccinePatientID]
        );

        if (patient.rows.length != 1) {
            throw 'VaccinePatientNotFound';
        }

        let records = await pool.query(
            'select * from vaccine_record where id = $1',
            [patient.rows[0].vaccine_record_id]
        );

        let returned = records.rows;

        await pool.query('commit');
        return returned;
    } catch (err) {
        await pool.query('rollback');
        return err;
    }
}

/**
 * @param {Number} vaccinePatientID 
 */
async function createRecord(vaccinePatientID) {
    try {
        await pool.query('begin');

        let created = await pool.query(
            `insert into vaccine_record retuning id`
        );

        if (created.rowCount == 0) {
            throw 'CreatedEmptyRecordError';
        }

        if (0 in arguments) {
            let update = await pool.query(
                `update vaccine_patient set (vaccine_record_id = $1) where id = $2`,
                [Number(created.rows[0].id), Number(vaccinePatientID)]
            );

            if (update.rowCount == 0) {
                throw 'UpdateBoundVaccineRecordIDError';
            }
        }

        await pool.query('commit');

        return 1;
    } catch (error) {
        await pool.query('rollback');
        return error;
    }
}

/**
 * 
 * @param {VaccinationProgram} program 
 * @param {Number} vaccineRecordID 
 */
async function createVaccinationProgram(program, vaccineRecordID) {
    if (!(program && program.against && program.age && program.age.first)) {
        return 'MissingRequiredDataError';
    }

    try {
        await pool.query('begin');
        let vaccineProgram = await pool.query(
            `insert into vaccine_record_extended (vaccine_record_id,against,description,age_first,age_second,age_third) values($1,$2,$3,$4,$5,$6)`,
            [
                Number(vaccineRecordID),
                program.against,
                program.description || null,
                Number(program.age.first),
                Number(program.age.second) || null,
                Number(program.age.third) || null,
            ]
        );

        if (vaccineProgram.rowCount == 0) {
            throw 'InsertVaccinationProgramError';
        }

        await pool.query('commit');
        return 1;
    } catch (error) {
        await pool.query('rollback');
        return error;
    }
}

/**
 * 
 * @param {Vaccine} vaccineData
 * @param {Number} vaccineRecordID
 * @param {VaccinationRecord} vaccineRecordData
 */
async function doVaccination(vaccineData, vaccineRecordID, vaccineRecordData) {
    try {
        await pool.query('begin');

        let vaccineValues = [];
        let vaccineKeys = Object.keys(vaccineData);
        let i = 1;
        Array.prototype.push.apply(vaccineValues, Object.values(vaccineData));
        let createdVaccine = await pool.query(
            `insert into vaccine ${
                vaccineData ? `(${vaccineKeys.join(',')})` : ''
            } ${
                vaccineData ? `values(${vaccineKeys.map(() => '$' + i++).join(',')})` : ''
            } returning id`,
            vaccineValues
        );

        if (createdVaccine.rowCount == 0) {
            throw 'InsertVaccineError';
        }

        let rData = {
            ...vaccineRecordData
        }
        if (rData.period) {
            r.against = ({
                1: 'first',
                2: 'second',
                3: 'third'
            })[rData.against] || '_';
        }
        let updatedVaccineRecord = await pool.query(
            `update from vaccine_record set (${rData.against}_${rData.period} = $1,vaccine_id_${rData.against}_${rData.period} = $2) where id = $3`,
            [
                rData.date,
                Number(createdVaccine.rows[0].id),
                Number(vaccineRecordID)
            ]
        );

        if (updatedVaccineRecord.rowCount == 0) {
            let extendedVaccineRecord = await pool.query(
                `update from vaccine_record_extended set(${rData.period} = $1) where vaccine_record_id = $2 && against = $3`,
                [
                    rData.date,
                    Number(vaccineRecordID),
                    rData.against
                ]
            );

            if(extendedVaccineRecord.rowCount == 0){
                throw 'UpdateVaccineRecordError';
            }
        }

        await pool.query('commit');

        return 1;
    } catch (error) {
        await pool.query('rollback');
        return error;
    }
}