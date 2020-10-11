/**
 * @typedef {Object} VaccinePatient
 * @property {Number} id
 * @property {String} firstname
 * @property {String} lastname
 * @property {Boolean} is_primary
 * 
 * @typedef {Object} VaccinePatientCreatingContext
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
const {
    checkUserName, isPatientAvailableFor
} = require("./_misc");

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
        let checkUser = await checkUserName(client, username);
        if (!checkUser) throw ERRORS.USER_NOT_FOUND;

        let available = await client.query(
            `SELECT firstname,lastname,id,TRUE as is_primary FROM vaccine_patient
                WHERE id = $1
                UNION
             SELECT vaccine_patient.firstname,vaccine_patient.lastname,vaccine_patient.id,FALSE as is_primary FROM vaccine_patient
                INNER JOIN parenting ON parenting.vaccine_patient_id = vaccine_patient.id
                INNER JOIN person ON person.id = parenting.person_id
                WHERE person.id = $2
            `,
            [
                Number(checkUser.person.vaccine_patient_id),
                Number(checkUser.person.id)
            ]
        );

        if (available.rows.length == 0) {
            throw ERRORS.PATIENT_NOT_FOUND;
        }

        /** @type {Array<VaccinePatient>} */
        const result = [];
        Array.prototype.push.apply(result, available.rows);

        return result;

    } catch (error) {
        await client.query('ROLLBACK');
        return new ErrorWithCode(error);
    }
}

/**
 * Create a patient for user.
 * 
 * @param {import('pg').Client} client 
 * @param {String} username
 * @param {VaccinePatientCreatingContext} details
 */
async function createPatientForSelf(client, username, details) {
    try {
        await client.query('BEGIN');

        let checkUser = await checkUserName(client, username);
        if (!checkUser) throw ERRORS.USER_NOT_FOUND;

        let patient = await client.query(
            `INSERT INTO vaccine_patient (firstname,lastname) VALUES($1,$2) 
                RETURNING firstname,lastname,id,TRUE AS is_primary`,
            [
                details.firstname,
                details.lastname
            ]
        );

        if (patient.rowCount != 1) {
            throw ERRORS.CREATING_PATIENT_ERROR;
        }

        let updatedPerson = await client.query(
            'UPDATE person SET vaccine_patient_id = $1 WHERE id = $2',
            [
                Number(patient.rows[0].id),
                Number(person.rows[0].id)
            ]
        );

        if (updatedPerson.rowCount != 1) {
            throw ERRORS.CREATING_PATIENT_ERROR;
        }

        await client.query('COMMIT');

        /** @type {VaccinePatient} */
        let result = { ...patient.rows[0] };

        return result;
    } catch (error) {
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
        if (!username) throw ERRORS.USER_NOT_FOUND;

        var user = await client.query(
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

        let values = Object.values(details);
        values.push(Number(person.rows[0].vaccine_patient_id));
        let i = 1;
        var edited = await client.query(
            `UPDATE vaccine_patient 
                SET ${Object.keys(details).map(x => `${x} =  $${i++}`).join(',')} 
                WHERE id = $${i}
                RETURNING firstname,lastname,id
            `,
            values
        );

        if (edited.rowCount != 1) {
            throw ERRORS.MODIFYING_PATIENT_ERROR;
        }

        await client.query('COMMIT');

        /** @type {VaccinePatient} */
        let result = { ...edited.rows[0] };
        return result;
    } catch (error) {
        // console.log(error);
        await client.query('ROLLBACK');
        return new ErrorWithCode(error);
    }
}

/**
 * Create a patient for user as a child.
 * 
 * @param {import('pg').Client} client 
 * @param {String} username 
 * @param {VaccinePatientCreatingContext} details 
 */
async function createPatientAsChild(client, username, details) {
    try {
        await client.query('BEGIN');

        let checkUser = await checkUserName(client, username);
        if (!checkUser) throw ERRORS.USER_NOT_FOUND;

        let patient = await client.query(
            `INSERT INTO vaccine_patient (firstname,lastname) VALUES($1,$2)
                RETURNING id,firstname,lastname,FALSE AS is_primary`,
            [
                details.firstname,
                details.lastname
            ]
        );

        if (patient.rowCount != 1) {
            throw ERRORS.CREATING_PATIENT_ERROR;
        }

        let parenting = await client.query(
            'INSERT INTO parenting (person_id,vaccine_patient_id) VALUES($1,$2)',
            [
                Number(checkUser.person.id),
                Number(patient.rows[0].id)
            ]
        );

        if (parenting.rowCount != 1) {
            throw ERRORS.CREATING_PATIENT_ERROR;
        }

        await client.query('COMMIT');

        /** @type {VaccinePatient} */
        let result = { ...patient.rows[0] };

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
async function removePatient(client, username, vaccinePatientId) {
    try {
        await client.query('BEGIN');

        let checkUser = await checkUserName(client, username);
        if (!checkUser) throw ERRORS.USER_NOT_FOUND;

        let available = await isPatientAvailableFor(client, vaccinePatientId, checkUser.person.id);

        if (!available) throw ERRORS.REMOVING_PATIENT_ERROR;

        await client.query(
            'DELETE FROM parenting WHERE person_id = $1 AND vaccine_patient_id = $2',
            [
                Number(checkUser.person.id),
                Number(vaccinePatientId)
            ]
        );

        let removing = await client.query(
            'DELETE FROM vaccine_patient WHERE id = $1 RETURNING *',
            [
                Number(vaccinePatientId)
            ]
        );

        if(removing.rowCount != 1 || removing.rows.length != 1) throw ERRORS.REMOVING_PATIENT_ERROR;

        await client.query(
            'DELETE FROM vaccine_record WHERE id = $1',
            [
                Number(removing.rows[0].vaccine_record_id),
            ]
        );
        await client.query('COMMIT');

        return true;
    } catch (error) {
        console.log(error);
        await client.query('ROLLBACK');
        return new ErrorWithCode(error);
    }
}

module.exports = {
    doViewPatient,
    doCreatePatient,
    doEditPatient,
    createPatientForSelf,
    createPatientAsChild,
    editPatient,
    getAvailablePatients,
    removePatient
};