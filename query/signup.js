/**
 * @typedef {Object} UserData
 * @property {String} firstName
 * @property {String} lastName
 * @property {String} username
 * @property {String} password
 * @property {Number|BigInt} namePrefix
 * @property {String[13]} idNumber
 * @property {Number|BigInt} gender 
 */

const idValidator = require("thai-id-card");
const {
    UserNameExistError,
    IdentityExistError,
    InvalidIdNumberError,
    EmptyInputError,
    SigninError
} = require("../error");

/**
 * @param {import("pg").Client} conn
 * @param {UserData} user
 */
async function doSignUp(conn, user) {

    if (!idValidator.verify(user.idNumber)) {
        return new SigninError(new InvalidIdNumberError(user.idNumber));
    }

    let queryString = {
        check: {
            person: "select * from person where id_number = $1",
            userAccount: "select * from user_account where username = $1"
        },
        create: {
            person: "insert into person (firstname,lastname,gender,name_prefix,id_number) values($1,$2,$3,$4,$5) returning id",
            userAccount: "insert into user_account (username, password, person_id) values($1, crypt($2, gen_salt('md5')), $3) returning id",
        }
    };

    try {
        await conn.query('begin');

        let countUser = await conn.query(
            queryString.check.userAccount,
            [user.username]
        );

        if (countUser.rows.length > 0) {
            throw new UserNameExistError(user.username);
        }

        let countPerson = await conn.query(
            queryString.check.userAccount,
            [user.idCardNumber]
        );

        if (countPerson.rows.length > 0) {
            throw new IdentityExistError(user.idCardNumber);
        }

        let personID = await (await conn.query(
            queryString.create.person,
            [
                user.firstName,
                user.lastName,
                Number(user.gender),
                Number(user.namePrefix),
                user.idNumber
            ]
        )).rows[0].id;

        await conn.query(
            queryString.create.userAccount,
            [
                user.username,
                user.password,
                Number(personID)
            ]
        );

        await conn.query('commit');

        return 1;
    } catch (err) {
        await conn.query('rollback');
        return new SigninError(err);
    }
}

module.exports = {
    doSignUp
};