/**
 * @typedef {Object} VaccinePatient
 * @property {Number} id
 * @property {String} firstname
 * @property {String} lastname
 * @property {Number} name_prefix
 * @property {Number} vaccine_record_id
 * 
 * @typedef {Object} Person
 * @property {String} id
 * @property {String} firstname
 * @property {String} lastname
 * @property {String} name_prefix
 * @property {String} gender
 * @property {String} vaccine_patient_id
 */
/** @namespace */
/**
 * 
 * @param {import('pg').Client} client 
 * @param {String} username
 */
async function checkUserName(client, username) {
    if (!username) return null;

    var user = await client.query(
        'SELECT * FROM user_account WHERE username = $1',
        [
            username
        ]
    );
    if (user.rows.length != 1) {
        return null;
    }

    var person = await client.query(
        'SELECT * FROM person WHERE id = $1',
        [
            Number(user.rows[0].person_id)
        ]
    );

    if (person.rows.length != 1) {
        return null;
    }

    return {
        /** @type {Person} */
        person: { ...person.rows[0], },
    };
}
/**
 * 
 * @param {import('pg').Client} client 
 * @param {Number} vaccine_record_id 
 * @param {Number} person_id 
 */
async function isRecordAvailableFor(client, vaccine_record_id, person_id) {

    let person = await client.query(
        'SELECT * FROM person WHERE id = $1',
        [
            Number(person_id)
        ]
    );

    if (person.rows.length != 1) return false;

    let patient = await client.query(
        `   
            WITH p AS (SELECT vaccine_patient_id FROM parenting WHERE person_id = $1)
                SELECT * FROM vaccine_patient WHERE id = $2 OR id IN (SELECT vaccine_patient_id FROM p)
        `,
        [
            Number(person_id),
            Number(person.rows[0].vaccine_patient_id)
        ]
    );

    return !!patient.rows.find(x => Number(x.vaccine_record_id) == Number(vaccine_record_id));
}

/**
 * 
 * @param {import('pg').Client} client 
 * @param {Number} vaccine_patient_id 
 * @param {Number} person_id 
 */
async function isPatientAvailableFor(client, vaccine_patient_id, person_id) {
    let available = await client.query(
        `
            SELECT vaccine_patient.id FROM vaccine_patient WHERE
                vaccine_patient.id IN (
                    SELECT person.vaccine_patient_id FROM person WHERE person.id = $1
                )
                OR vaccine_patient.id IN (
                    SELECT parenting.vaccine_patient_id FROM parenting WHERE parenting.person_id = $1
                )
        `,
        [
            Number(person_id),
        ]
    );

    return !!available.rows.find(e => Number(e.id) === Number(vaccine_patient_id));
}
/**
 * 
 * @param {import('pg').Client} client 
 * @param {Number} vaccine_patient_id 
 * @param {Number} person_id 
 */
async function checkPatient(client, vaccine_patient_id, person_id) {
    let patient = await client.query(
        `
            SELECT * FROM vaccine_patient WHERE
                vaccine_patient.id IN (
                    SELECT person.vaccine_patient_id FROM person WHERE person.id = $1
                )
                OR vaccine_patient.id IN (
                    SELECT parenting.vaccine_patient_id FROM parenting WHERE parenting.person_id = $1
                )
                AND vaccine_patient.id = $2
        `,
        [
            Number(person_id),
            Number(vaccine_patient_id)
        ]
    );

    /** @type {VaccinePatient} */
    let result = patient.rows.length == 1 ? {
        ...patient.rows[0],
    } : null;

    return result;
}


module.exports = {
    checkUserName,
    checkPatient,
    isRecordAvailableFor,
    isPatientAvailableFor
}