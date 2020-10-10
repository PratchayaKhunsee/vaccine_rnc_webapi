const {
    ERRORS, ErrorWithCode,
} = require('../error');

/**
 * @param {import('pg').Client} client
 * @param {String} username 
 * @param {String} password 
 */
async function logIn(client, username, password) {
    try {
        if (!(username && password)) {
            throw ERRORS.EMPTY_FIELD_FOUND;
        }

        await client.query('BEGIN');

        let userAccount = await client.query(
            "SELECT * FROM user_account WHERE username = $1 AND password = crypt($2, password)",
            [
                username,
                password
            ]
        );

        if (userAccount.rows.length != 1) {
            throw ERRORS.LOGIN_AUTH_ERROR;
        }

        let person = await client.query(
            "SELECT * FROM person WHERE id = $1",
            [
                Number(userAccount.rows[0].person_id)
            ]
        );

        if (person.rows.length != 1) {
            throw ERRORS.LOGIN_AUTH_ERROR;
        }

        await client.query('COMMIT');
        return true;
    } catch (error) {
        await client.query('ROLLBACK');
        return new ErrorWithCode(error);
    }
}

module.exports = {
    logIn
}