const pool = require("../database");

module.exports = {
    viewParenting,
    createParenting,
    removeParenting
};

/**
 * 
 * @param {Number} personID 
 */
async function viewParenting(personID) {
    try {
        await pool.query('begin');
        let parenting = await pool.query(
            `select vaccine_patient.* from parenting where person_id = $1 right join vaccine_patient on parenting.vaccine_patient_id = vaccine_patient.id`,
            [
                Number(personID)
            ]
        );

        if (parenting.rows.length == 0) {
            throw 'SelectParentingError';
        }

        await pool.query('commit');

        return parenting.rows.map(x => {
            return {
                ...x
            };
        });
    } catch (error) {
        await pool.query('rollback');
        return error;
    }
}

/**
 * 
 * @param {Number} personID 
 * @param {Number} vaccinePatientID 
 */
async function createParenting(personID, vaccinePatientID) {
    try {
        await pool.query('begin');
        let parenting = await pool.query(
            `insert into parenting (person_id,vaccine_patient_id) values($1,$2)`,
            [
                Number(personID),
                Number(vaccinePatientID)
            ]
        );

        if (parenting.rowCount == 0) {
            throw 'InsertParentingError';
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
 * @param {Number} parentingID
 */
async function removeParenting(parentingID) {
    try {
        await pool.query('begin');
        let deleted = await pool.query(
            `delete from parenting where id = $1`,
            [
                Number(parentingID),
            ]
        );

        if (deleted.rowCount == 0) {
            throw 'DeleteParentingError';
        }

        await pool.query('commit');

        return 1;
    } catch (error) {
        await pool.query('rollback');
        return error;
    }
}