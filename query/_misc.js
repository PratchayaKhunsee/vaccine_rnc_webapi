/**
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
async function isRecordAvailableFor(client, vaccine_record_id, person_id){

    let person = await client.query(
        'SELECT * FROM person WHERE id = $1',
        [
            Number(person_id)
        ]
    );

    if(person.rows.length != 1) return false;
    console.log('person#${person_id} exist.');

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

    console.log(patient.rows);

    let result = !!patient.rows.find(x => Number(x.vaccine_record_id) == Number(vaccine_record_id));

    return result;
}


module.exports = {
    checkUserName,
    isRecordAvailableFor,
}