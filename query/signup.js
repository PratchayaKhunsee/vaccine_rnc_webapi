/**
 * @typedef {Object} UserData
 * @property {String} firstname
 * @property {String} lastname
 * @property {String} username
 * @property {String} password
 * @property {Number|BigInt} name_prefix
 * @property {String[13]} id_number
 * @property {Number|BigInt} gender 
 */

// const idValidator = require("thai-id-card");
const {
    ERRORS, ErrorWithCode
} = require("../error");

/**
 * Create new user account.
 * 
 * @param {import("pg").Client} conn
 * @param {UserData} user
 */
async function signUp(conn, user) {

    /** The query string set as an object. */
    let queryString = {
        create: {
            person: "INSERT INTO person (firstname,lastname,gender,name_prefix) VALUES($1,$2,$3,$4) RETURNING id",
            userAccount: "INSERT INTO user_account (username, password, person_id) VALUES($1, crypt($2, gen_salt('md5')), $3) RETURNING id",
        }
    };

    try {
        await conn.query('BEGIN');

        // Verify id_number
        // if (!idValidator.verify(user.id_number)) {
        //     throw ERRORS.INVALID_ID_NUMBER;
        // }

        console.log(user);

        /**
         * Result of creating a user account.
         */
        let person = await conn.query(
            queryString.create.userAccount,
            [
                user.firstname,
                user.lastname,
                Number(user.gender),
                Number(user.name_prefix)
            ]
        );

        /**
         * Result of creating a person information field.
         */
        let account = await conn.query(
            queryString.create.userAccount,
            [
                user.username,
                user.password,
                Number(person.rows[0].id)
            ]
        );

        // Cannot created a user account if username is redundant.
        if (account.rowCount != 1) {
            throw ERRORS.USERNAME_ALREADY_USED;
        }

        await conn.query('COMMIT');

        return true;
    } catch (error) {
        await conn.query('ROLLBACK');
        return new ErrorWithCode(error);
    }
}

module.exports = {
    signUp
};