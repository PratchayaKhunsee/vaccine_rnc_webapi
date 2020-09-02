/**
 * @typedef {Object} CertificationData
 * @property {Number} [vaccine_id]
 * @property {Number} [person_id]
 * @property {String} [clinician_signature]
 * @property {String} [clinician_prof_status]
 * @property {String} [certify_from]
 * @property {String} [certify_to]
 * @property {String} [adminstering_centre_stamp]
 */
/**
 * @param {import("../database").PgQueryMethod} q
 * @param {Number} personID 
 */
async function doViewCertifications(q, personID) {
    try {
        await q('begin');
        let certs = await q(
            `select * from certification where person_id = $1`,
            [
                Number(personID)
            ]
        );
        if (certs.rows.length == 0) {
            throw 'SelectCertificationError';
        }

        await q('commit');
        return certs.rows.map(x => {
            let cloned = {
                ...x
            };
            for (let name in cloned) cloned[name.replace(/_\w/g, d => d[1].toUpperCase())] = cloned[name];
            return x;
        });
    } catch (error) {
        await q('rollback');
        return error;
    }
}

/**
 * @param {import("../database").PgQueryMethod} q
 * @param {Number} personID
 * @param {Number} vaccineID
 * @param {CertificationData} [data]
 */
async function doCreateCertification(q, personID, vaccineID, data) {
    try {
        await q('begin');
        let cloned = {
            ...(data)
        };
        for (let name in cloned) {
            if (name == 'vaccine_id' || name == 'person_id') delete cloned[name];
        }
        let keys = Object.keys(cloned);
        let values = [
            Number(vaccineID),
            Number(personID)
        ];
        Array.prototype.push.apply(values, Object.values(cloned));
        let i = 3;
        let certification = await q(
            `insert into certification (vaccine_id,person_id${
                keys.length > 0 ? ',' + keys.join(',') : ''
            }) values ($1,$2${
                keys.length > 0 ? ',' + keys.map(() => '$' + i++).join(',') : ''
            })`,
            values
        );

        if (certification.rowCount == 0) {
            throw 'InsertCertificationError';
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
 * @param {Number} certificationID
 * @param {Number} personID
 * @param {CertificationData} data
 */
async function doEditCertification(q, certificationID, personID, data) {
    try {
        await q('begin');
        let cloned = {
            ...data
        };
        for (let name in cloned) {
            if (name == 'vaccine_id' || name == 'person_id') delete cloned[name];
        }
        let keys = Object.keys(cloned);
        let values = [
            Number(certificationID),
            Number(personID)
        ];
        let i = 1;
        Array.prototype.unshift.apply(values, Object.values(cloned));
        let updated = await q(
            `update certification set(${keys.map(x => x + ' = ' + i++).join(',')}) where id = $${i++} and person_id = $${i}`,
            values
        );

        if (updated.rowCount == 0) {
            throw 'UpdateCertificationError';
        }

        await q('commit');
    } catch (error) {
        await q('rollback');
        return error;
    }
}

module.exports = {
    doCreateCertification,
    doEditCertification,
    doViewCertifications,
};