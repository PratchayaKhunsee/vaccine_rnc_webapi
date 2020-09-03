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
 */

const { PatientNotFoundError, VaccineRecordNotFoundError, RecordError, CreateEmptyRecordError, UpdateRecordIDForPatientError, UpdateVaccinationError, CreateVaccineError, CreateVaccinationProgramError } = require("../error");

/**
 * @param {import("../database").PgQueryMethod} q
 * @param {Number} vaccinePatientID 
 */
async function doViewRecords(q, vaccinePatientID) {
    try {
        await q('begin');
        let patient = await q(
            'select * from vaccine_patient where id = $1',
            [Number(vaccinePatientID)]
        );

        if (patient.rows.length != 1) {
            throw new PatientNotFoundError(Number(vaccinePatientID));
        }

        let records = await q(
            'select * from vaccine_record where id = $1',
            [Number(patient.rows[0].vaccine_record_id)]
        );

        if(records.rows.length == 0){
            throw VaccineRecordNotFoundError(Number(vaccinePatientID));
        }

        let returned = records.rows.map(x => ({ ...x }));

        await q('commit');
        return returned;
    } catch (err) {
        await q('rollback');
        return new RecordError(err);
    }
}
/**
 * @param {import("../database").PgQueryMethod} q
 * @param {Number} vaccinePatientID 
 */
async function doCreateRecord(q, vaccinePatientID) {
    try {
        await q('begin');

        let created = await q(
            `insert into vaccine_record retuning id`
        );

        if (created.rowCount == 0) {
            throw new CreateEmptyRecordError();
        }

        if (0 in arguments) {
            let update = await q(
                `update vaccine_patient set (vaccine_record_id = $1) where id = $2`,
                [
                    Number(created.rows[0].id),
                    Number(vaccinePatientID)
                ]
            );

            if (update.rowCount == 0) {
                throw new UpdateRecordIDForPatientError(Number(vaccinePatientID));
            }
        }

        await q('commit');

        return 1;
    } catch (error) {
        await q('rollback');
        return new RecordError(error);
    }
}

/**
 * @param {import("../database").PgQueryMethod} q
 * @param {VaccinationProgram} program 
 * @param {Number} vaccineRecordID 
 */
async function doCreateVaccinationProgram(q, program, vaccineRecordID) {
    // if (!(program && program.against && program.age && program.age.first)) {
    //     return 'MissingRequiredDataError';
    // }

    try {
        await q('begin');
        let vaccineProgram = await q(
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
            throw new CreateVaccinationProgramError(Number(vaccineRecordID));
        }

        await q('commit');
        return 1;
    } catch (error) {
        await q('rollback');
        return new RecordError(error);
    }
}

/**
 * @param {import("../database").PgQueryMethod} q
 * @param {Vaccine} vaccineData
 * @param {Number} vaccineRecordID
 * @param {VaccinationRecord} vaccineRecordData
 */
async function doVaccination(q, vaccineData, vaccineRecordID, vaccineRecordData) {
    try {
        await q('begin');

        let vaccineValues = [];
        let vaccineKeys = Object.keys(vaccineData);
        let i = 1;
        Array.prototype.push.apply(vaccineValues, Object.values(vaccineData));
        let createdVaccine = await q(
            `insert into vaccine ${
                vaccineData ? `(${vaccineKeys.join(',')})` : ''
            } ${
                vaccineData ? `values(${vaccineKeys.map(() => '$' + i++).join(',')})` : ''
            } returning id`,
            vaccineValues
        );

        if (createdVaccine.rowCount == 0) {
            throw new CreateVaccineError();
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
        let updatedVaccineRecord = await q(
            `update from vaccine_record set (${rData.against}_${rData.period} = $1,vaccine_id_${rData.against}_${rData.period} = $2) where id = $3`,
            [
                rData.date,
                Number(createdVaccine.rows[0].id),
                Number(vaccineRecordID)
            ]
        );

        if (updatedVaccineRecord.rowCount == 0) {
            let extendedVaccineRecord = await q(
                `update from vaccine_record_extended set(${rData.period} = $1) where vaccine_record_id = $2 && against = $3`,
                [
                    rData.date,
                    Number(vaccineRecordID),
                    rData.against
                ]
            );

            if (extendedVaccineRecord.rowCount == 0) {
                throw new UpdateVaccinationError();
            }
        }

        await q('commit');

        return 1;
    } catch (error) {
        await q('rollback');
        return new RecordError(error);
    }
}

module.exports = {
    doViewRecords,
    doCreateRecord,
    doCreateVaccinationProgram,
    doVaccination
};