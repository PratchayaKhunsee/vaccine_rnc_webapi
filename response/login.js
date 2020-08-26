let pool = require('../database');
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
        return (async () => {
            await pool.query('begin');

            let personId = await (await pool.query(
                "select * from user_account where username = $1 and password = crypt($2, password) returning id",
                [username, password]
            )).rows[0].id;

            await pool.query('commit');

            let result = await (await pool.query(
                "select * from person where id = $1",
                [personId]
            ));

            if (result.rowCount != 1) {
                throw new UserNotFoundError(username);
            }

            /** @type {import('./signin').UserData} */
            let result = {
                ...(result.rows[0])
            };

            return result;
        })();

    } catch (err) {
        await pool.query('rollback');
        return new LoginError(err);
    }
};