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
        let result = await (async () => {
            await pool.query('begin');

            let person = await (await pool.query(
                "select * from user_account where username = $1 and password = crypt($2, password)",
                [username, password]
            ));

            if(person.rowCount != 1){
                return new UserNotFoundError(username);
            }

            let result = await (await pool.query(
                "select * from person where id = $1",
                [Number(person.rows[0].id)]
            ));

            if (result.rowCount != 1) {
                return new UserNotFoundError(username);
            }

            /** @type {import('./signin').UserData} */
            let returnedResult = {
                ...(result.rows[0])
            };

            await pool.query('commit');

            return returnedResult;
        })();

        if(result instanceof UserNotFoundError) throw result;
        return result;

    } catch (err) {
        await pool.query('rollback');
        console.log(err);
        return new LoginError(err);
    }
};