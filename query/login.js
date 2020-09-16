const {
    EmptyInputError,
    UserNotFoundError,
    LoginError
} = require('../error');

/**
 * @param {import('pg').Client} client
 * @param {String} username 
 * @param {String} password 
 */
async function doLogIn(client, username, password) {
    if (!(username && password)) {
        return new LoginError(new EmptyInputError());
    }

    try {
        await client.query('begin');

        let userAccount = await client.query(
            "select * from user_account where username = $1 and password = crypt($2, password)",
            [
                username,
                password
            ]
        );

        if (userAccount.rows.length != 1) {
            throw new UserNotFoundError(username);
        }

        let person = await client.query(
            "select * from person where id = $1",
            [
                Number(userAccount.rows[0].person_id)
            ]
        );

        if (person.rows.length != 1) {
            throw new UserNotFoundError(username);
        }

        let returned = {
            person: {
                ...(person.rows[0])
            },
            userAccount: {
                ...(userAccount.rows[0])
            }
        };

        delete returned.userAccount.password;

        await client.query('commit');
        return returned;
    } catch (err) {
        await client.query('rollback');
        return new LoginError(err);
    }
}

module.exports = {
    doLogIn
}