let pool = require('../database');
const {
    EmptyInputError,
    UserNotFoundError
} = require('../error');

module.exports = login;
/**
 * 
 * @param {String} username 
 * @param {String} password 
 * @param {Boolean} [returnUserInfo]
 * @returns {import('./signin').UserData|1}
 */
function login(username, password, returnUserInfo) {
    if (!(username && password)) {
        throw new EmptyInputError();
    }

    try {
        (async () => {
            await pool.query('begin');

            let personId = await (await pool.query(
                "select * from user_account where username = $1 and password = $2 returning id",
                [username, password]
            )).rows[0].id;
        
            await pool.query('commit');

            if (returnUserInfo) {
                let result = await (await pool.query(
                    "select * from person where id = $1",
                    [personId]
                ));

                if (result.rowCount != 1) {
                    throw new UserNotFoundError(username);
                }

                return {
                    ...(result.rows[0])
                };
            }

            return 1;
        })();

    } catch (err) {
        await pool.query('rollback');
        return err;
    }
};