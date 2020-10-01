/**
 * @typedef {Object} VaccinePatient
 * @property {String} [firstname]
 * @property {String} [lastname]
 */

/** @namespace */

const {
    PatientNotFoundError,
    PatientError,
    EditPatientProfileError,
    CreatePatientError,
    UpdatePatientIDForPersonError,
    ERRORS,
    ErrorWithCode
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
            `insert into vaccine_patient ${data ? `(${Object.keys(data).join(',')})` : ''} ${data ? `values(${Object.values(data).map(() => '$' + i++).join(',')})` : ''} retuning id`,
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

/**
 * Get all available patient for a user account.
 * 
 * @param {import('pg').Client} client 
 * @param {String} username
 */
async function getAvailablePatients(client, username) {
    try {
        let account = await client.query(
            'SELECT * FROM user_account WHERE username = $1',
            [
                String(username)
            ]
        );

        if (account.rows.length != 1) {
            throw ERRORS.USER_NOT_FOUND;
        }

        let person = await client.query(
            'SELECT * FROM person WHERE id = $1',
            [
                Number(account.rows[0].person_id)
            ]
        );

        if (person.rows.length != 1) {
            throw ERRORS.USER_NOT_FOUND;
        }

        let available = await client.query(
            `SELECT firstname,lastname,id FROM vaccine_patient
                WHERE id = $1
                UNION
             SELECT vaccine_patient.firstname,vaccine_patient.lastname,vaccine_patient.id FROM vaccine_patient
                INNER JOIN parenting ON parenting.vaccine_patient_id = vaccine_patient.id
                INNER JOIN person ON person.id = parenting.person_id
                WHERE person.id = $2
            `,
            [
                Number(person.rows[0].vaccine_patient_id),
                Number(person.rows[0].id)
            ]
        );

        if (available.rows.length == 0) {
            throw ERRORS.PATIENT_NOT_FOUND;
        }

        /** @type {VaccinePatient[]} */
        const result = [];
        Array.prototype.push.apply(result, available.rows);

        return result;

    } catch (error) {
        await client.query('ROLLBACK');
        // console.log(error);
        return new ErrorWithCode(error);
    }
}

/**
 * Create a patient who can hold vaccine records.
 * 
 * @param {import('pg').Client} client 
 * @param {String} username
 * @param {VaccinePatient} details
 */
async function createPatient(client, username, details) {
    try {
        await client.query('BEGIN');
        if (username) {
            let user = await client.query(
                'SELECT * FROM user_account WHERE username = $1',
                [
                    username
                ]
            );
            if (user.rows.length != 1) {
                throw ERRORS.USER_NOT_FOUND;
            }

            var person = await client.query(
                'SELECT * FROM person WHERE id = $1',
                [
                    Number(user.rows[0].person_id)
                ]
            );

            if (person.rows.length != 1) {
                throw ERRORS.USER_NOT_FOUND;
            }
        }

        let patient = await client.query(
            `INSERT INTO vaccine_patient (firstname,lastname) VALUES($1,$2) RETURNING id`,
            [
                details.firstname,
                details.lastname
            ]
        );

        if (patient.rowCount != 1) {
            throw ERRORS.CREATING_PATIENT_ERROR;
        }

        let id = Number(patient.rows[0].id);

        let updatedPerson = await client.query(
            'UPDATE person SET vaccine_patient_id = $1 WHERE id = $2',
            [
                Number(id),
                Number(person.rows[0].id)
            ]
        );

        if(updatedPerson.rowCount != 1){
            throw ERRORS.CREATING_PATIENT_ERROR;
        }


        await client.query('COMMIT');

        return id;
    } catch (error) {
        console.log(error);
        await client.query('ROLLBACK');
        return new ErrorWithCode(error);
    }
}

/**
 * Edit the patient information.
 * 
 * @param {import('pg').Client} client 
 * @param {String} username 
 * @param {VaccinePatient} details 
 */
async function editPatient(client, username, details) {
    try {
        await client.query('BEGIN');
        if(!username) throw null;

        var user = await client.query(
            'SELECT * FROM user_account WHERE username = $1:text',
            [
                username
            ]
        );
        if (user.rows.length != 1) {
            throw null;
        }

        var person = await client.query(
            'SELECT * FROM person WHERE id = $1:bigint',
            [
                Number(user.rows[0].person_id)
            ]
        );

        if (person.rows.length != 1) {
            throw null;
        }

        let values = Object.values(details);
        values.push(Number(person.rows[0].vaccine_patient_id));
        let i = 1;
        var edited = await client.query(
            `UPDATE vaccine_patient 
                SET ${Object.keys(details).map((x, i) => `${x} =  $${i++}`).join(',')} 
                WHERE id = $${i}
            `,
            values
        );

        if(edited.rowCount != 1){
            throw null;
        }

        await client.query('COMMIT');

        return 1;
    } catch (error) {
        await client.query('ROLLBACK');
        return new PatientError(error);
    }
}

module.exports = {
    doViewPatient,
    doCreatePatient,
    doEditPatient,
    createPatient,
    editPatient,
    getAvailablePatients,
};