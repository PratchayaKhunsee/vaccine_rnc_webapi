const {
    PatientNotFoundError,
    PatientError,
    EditPatientProfileError,
    CreatePatientError,
    UpdatePatientIDForPersonError
} = require("../error");

/**
 * @param {import("../database").PgQueryMethod} q
 * @param {Number} vaccinePatientID
 */
async function doViewPatient(q, vaccinePatientID) {
    try {
        await q('begin');

        let vaccinePatient = await q(
            'select * from vaccine_patient where id = $1',
            [Number(vaccinePatientID)]
        );

        if (vaccinePatient.rows.length != 1) {
            throw new PatientNotFoundError(Number(vaccinePatientID));
        }

        let returned = {
            ...(vaccinePatient.rows[0])
        };

        await q('commit');
        return returned;
    } catch (err) {
        await q('rollback');
        return new PatientError(err);
    }
}

/**
 * @param {import("../database").PgQueryMethod} q
 * @param {Number} vaccinePatientID
 * @param {Object} data
 */
async function doEditPatient(q, vaccinePatientID, data) {
    try {
        await q('begin');

        let i = 1;
        let values = [Number(vaccinePatientID)];
        Array.prototype.unshift.apply(values, Object.values(data));
        let result = await q(
            `update vaccine_patient set(${Object.keys(data).map(x => x + ' = $' + i++)}) where id = $${i}`,
            values
        );

        if (result.rowCount == 0) {
            throw new EditPatientProfileError(Number(vaccinePatientID));
        }

        await q('commit');
        return 1;

    } catch (err) {
        await q('rollback');
        return new PatientError(err);
    }
}

/**
 * @param {import("../database").PgQueryMethod} q
 * @param {Object} data
 * @param {Number} [personID] 
 */
async function doCreatePatient(q, data, personID) {
    try {
        await q('begin');
        let values = [];
        Array.prototype.push.apply(values, Object.values(data));
        let i = 1;
        let created = await q(
            `insert into vaccine_patient ${data ? `(${Object.keys(data).join(',')})` : ''} ${data ? `values(${Object.values(data).map(() => '$' + i++ ).join(',')})` : ''} retuning id`,
            values
        );

        if (created.rowCount == 0) {
            throw new CreatePatientError(Number(personID));
        }

        await q('commit');

        if (1 in arguments) {
            let update = await q(
                `update person set (vaccine_patient_id = $1) where id = $2`,
                [Number(created.rows[0].id), Number(personID)]
            );

            if (update.rowCount == 0) {
                throw new UpdatePatientIDForPersonError(Number(personID));
            }

        }

        return 1;
    } catch (error) {
        await q('rollback');
        return new PatientError(error);
    }
}

module.exports = {
    doViewPatient,
    doCreatePatient,
    doEditPatient
};