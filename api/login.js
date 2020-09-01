const pool = require('../database');
const {
    EmptyInputError,
    UserNotFoundError,
    LoginError
} = require('../error');

module.exports = login;
/**
 * 
 * @param {String} username 
 * @param {String} password 
 */
async function login(username, password) {
    if (!(username && password)) {
        return new LoginError(new EmptyInputError());
    }

    try {
        await pool.query('begin');

        let userAccount = await pool.query(
            "select * from user_account where username = $1 and password = crypt($2, password)",
            [
                username,
                password
            ]
        );

        if (userAccount.rows.length != 1) {
            throw new UserNotFoundError(username);
        }

        let person = await pool.query(
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

        delete returned.person.password;

        await pool.query('commit');
        return returned;
    } catch (err) {
        await pool.query('rollback');
        return new LoginError(err);
    }
};