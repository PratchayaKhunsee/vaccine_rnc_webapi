/**
 * @param {import("../database").PgQueryMethod} q
 * @param {Number} personID 
 */
async function doViewParenting(q, personID) {
    try {
        await q('begin');
        let parenting = await q(
            `select vaccine_patient.* from parenting where person_id = $1 right join vaccine_patient on parenting.vaccine_patient_id = vaccine_patient.id`,
            [
                Number(personID)
            ]
        );

        if (parenting.rows.length == 0) {
            throw 'SelectParentingError';
        }

        await q('commit');

        return parenting.rows.map(x => {
            return {
                ...x
            };
        });
    } catch (error) {
        await q('rollback');
        return error;
    }
}

/**
 * @param {import("../database").PgQueryMethod} q
 * @param {Number} personID 
 * @param {Number} vaccinePatientID 
 */
async function doCreateParenting(q, personID, vaccinePatientID) {
    try {
        await q('begin');
        let parenting = await q(
            `insert into parenting (person_id,vaccine_patient_id) values($1,$2)`,
            [
                Number(personID),
                Number(vaccinePatientID)
            ]
        );

        if (parenting.rowCount == 0) {
            throw 'InsertParentingError';
        }

        await q('commit');

        return 1;
    } catch (error) {
        await q('rollback');
        return error;
    }
}

/**
 * @param {import("../database").PgQueryMethod} q
 * @param {Number} parentingID
 */
async function doRemoveParenting(q, parentingID) {
    try {
        await q('begin');
        let deleted = await q(
            `delete from parenting where id = $1`,
            [
                Number(parentingID),
            ]
        );

        if (deleted.rowCount == 0) {
            throw 'DeleteParentingError';
        }

        await q('commit');

        return 1;
    } catch (error) {
        await q('rollback');
        return error;
    }
}

module.exports = {
    doViewParenting,
    doCreateParenting,
    doRemoveParenting
};