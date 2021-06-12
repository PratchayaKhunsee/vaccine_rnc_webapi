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

// const {
//     ERRORS,
//     ErrorWithCode
// } = require("../error");
const {
    checkUserName, isPatientAvailableFor
} = require("./_misc");
const { QueryResultError } = require('../error');

/**
 * View the owned patient information.
 * 
 * @param {import("pg").Client} client
 * @param {Number} vaccinePatientID
 */
async function viewPatient(client, vaccinePatientID) {
    try {
        await client.query('BEGIN');

        let vaccinePatient = await client.query(
            'SELECT * FROM vaccine_patient WHERE id = $1',
            [Number(vaccinePatientID)]
        );

        if (vaccinePatient.rows.length != 1) {
            return {};
        }

        let returned = {
            ...(vaccinePatient.rows[0])
        };

        await client.query('COMMIT');
        return returned;
    } catch (err) {
        await client.query('ROLLBACK');
        throw QueryResultError.unexpected();
    }
}

/**
 * Edit the owned patient information
 * 
 * @param {import("pg").Client} client
 * @param {Number} vaccinePatientID
 * @param {Object} data
 */
async function editPatient(client, vaccinePatientID, data) {
    try {
        const PATIENT_MODIFYING_FAILED = new QueryResultError('PATIENT_MODIFYING_FAILED');
        await client.query('BEGIN');

        let i = 1;
        let values = [Number(vaccinePatientID)];
        Array.prototype.unshift.apply(values, Object.values(data));
        let result = await client.query(
            `UPDATE vaccine_patient SET(${Object.keys(data).map(x => x + ' = $' + i++)}) WHERE id = $${i}`,
            values
        );

        if (result.rowCount == 0) {
            throw PATIENT_MODIFYING_FAILED;
        }

        await client.query('COMMIT');

        return true;

    } catch (err) {
        await client.query('ROLLBACK');
        throw QueryResultError.unexpected(err);
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
        /** @type {Array<VaccinePatient>} */
        const result = [];
    
        let checkUser = await checkUserName(client, username);
        if (!checkUser) throw null;

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
        
        Array.prototype.push.apply(result, available.rows);

        return result;

    } catch (error) {
        await client.query('ROLLBACK');
        throw QueryResultError.unexpected();
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

        const PATIENT_SELF_CREATING_FAILED = new QueryResultError('PATIENT_SELF_CREATING_FAILED');

        await client.query('BEGIN');

        let checkUser = await checkUserName(client, username);
        if (!checkUser) throw null;

        let patient = await client.query(
            `INSERT INTO vaccine_patient (firstname,lastname) VALUES($1,$2) 
                RETURNING firstname,lastname,id,TRUE AS is_primary`,
            [
                details.firstname,
                details.lastname
            ]
        );

        if (patient.rowCount != 1) {
            throw PATIENT_SELF_CREATING_FAILED;
        }

        let updatedPerson = await client.query(
            'UPDATE person SET vaccine_patient_id = $1 WHERE id = $2',
            [
                Number(patient.rows[0].id),
                Number(person.rows[0].id)
            ]
        );

        if (updatedPerson.rowCount != 1) {
            throw PATIENT_SELF_CREATING_FAILED;
        }

        await client.query('COMMIT');

        /** @type {VaccinePatient} */
        let result = { ...patient.rows[0] };

        return result;
    } catch (error) {
        await client.query('ROLLBACK');
        throw QueryResultError.unexpected(error);
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
        const PATIENT_CREATING_FAILED = new QueryResultError('PATIENT_CREATING_FAILED');

        await client.query('BEGIN');

        let checkUser = await checkUserName(client, username);
        if (!checkUser) throw null;

        let patient = await client.query(
            `INSERT INTO vaccine_patient (firstname,lastname) VALUES($1,$2)
                RETURNING id,firstname,lastname,FALSE AS is_primary`,
            [
                details.firstname,
                details.lastname
            ]
        );

        if (patient.rowCount != 1) {
            throw null;
        }

        let parenting = await client.query(
            'INSERT INTO parenting (person_id,vaccine_patient_id) VALUES($1,$2)',
            [
                Number(checkUser.person.id),
                Number(patient.rows[0].id)
            ]
        );

        if (parenting.rowCount != 1) {
            throw PATIENT_CREATING_FAILED;
        }

        await client.query('COMMIT');

        /** @type {VaccinePatient} */
        let result = { ...patient.rows[0] };

        return result;
    } catch (error) {
        await client.query('ROLLBACK');
        throw QueryResultError.unexpected(error);
    }
}

// /**
//  * 
//  * @param {import('pg').Client} client 
//  * @param {String} username 
//  * @param {Number} vaccinePatientId 
//  */
// async function removePatient(client, username, vaccinePatientId) {
//     try {
//         await client.query('BEGIN');

//         let checkUser = await checkUserName(client, username);
//         if (!checkUser) throw ERRORS.USER_NOT_FOUND;

//         let available = await isPatientAvailableFor(client, vaccinePatientId, checkUser.person.id);

//         if (!available) throw ERRORS.REMOVING_PATIENT_ERROR;

//         await client.query(
//             'DELETE FROM parenting WHERE person_id = $1 AND vaccine_patient_id = $2',
//             [
//                 Number(checkUser.person.id),
//                 Number(vaccinePatientId)
//             ]
//         );

//         let removing = await client.query(
//             'DELETE FROM vaccine_patient WHERE id = $1 RETURNING *',
//             [
//                 Number(vaccinePatientId)
//             ]
//         );

//         if (removing.rowCount != 1 || removing.rows.length != 1) throw ERRORS.REMOVING_PATIENT_ERROR;

//         await client.query(
//             'DELETE FROM vaccine_record WHERE id = $1',
//             [
//                 Number(removing.rows[0].vaccine_record_id),
//             ]
//         );
//         await client.query('COMMIT');

//         return true;
//     } catch (error) {
//         // ;
//         await client.query('ROLLBACK');
//         return new ErrorWithCode(error);
//     }
// }

module.exports = {
    viewPatient,
    // createPatient,
    editPatient,
    createPatientForSelf,
    createPatientAsChild,
    editPatient,
    getAvailablePatients,
    // removePatient
};