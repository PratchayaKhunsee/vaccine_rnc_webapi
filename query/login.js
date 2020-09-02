const {
    EmptyInputError,
    UserNotFoundError,
    LoginError
} = require('../error');

/**
 * @param {import("../database").PgQueryMethod} q
 * @param {String} username 
 * @param {String} password 
 */
async function doLogIn(q, username, password) {
    if (!(username && password)) {
        return new LoginError(new EmptyInputError());
    }

    try {
        await q('begin');

        let userAccount = await q(
            "select * from user_account where username = $1 and password = crypt($2, password)",
            [
                username,
                password
            ]
        );

        if (userAccount.rows.length != 1) {
            throw new UserNotFoundError(username);
        }

        let person = await q(
            "select * from person where id = $1",
            [
                Number(person.rows[0].id)
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

        await q('commit');
        return returned;
    } catch (err) {
        await q('rollback');
        return new LoginError(err);
    }
}

module.exports = {
    doLogIn
}