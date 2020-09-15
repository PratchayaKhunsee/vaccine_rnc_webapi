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
 * @param {import("../database").PgQueryMethod} q
 * @param {UserData} user
 */
async function doSignUp(q, user) {
    for (let name in user) {
        if (!user[name]) {
            return new SigninError(new EmptyInputError());
        }
    }

    for (let name of ['firstName', 'lastName', 'namePrefix', 'idNumber', 'gender', 'username', 'password']) {
        if (!user[name]) return new SigninError(new EmptyInputError());
    }

    if (!idValidator.verify(userData.idCardNumber)) {
        return new SigninError(new InvalidIdNumberError(userData.idCardNumber));
    }

    let queryString = {
        check: {
            person: "select count(*) as 'count' from person where idcard_number = $1",
            userAccount: "select count(*) as 'count' from user_account where username = $1"
        },
        create: {
            person: "insert into person (firstname,lastname,gender,name_prefix,idcard_number) values($1,$2,$3,$4,$5,$6) returning id",
            userAccount: "insert into user_account (username, password, person_id) values($1, crypt($2, gen_salt('md5')), $3) returning id",
        }
    };

    try {
        await q('begin');

        let countUser = await q(
            queryString.check.userAccount,
            [user.username]
        ).rows[0].count;

        if (Number(countUser) > 0) {
            throw new UserNameExistError(user.username);
        }

        let countPerson = await q(
            queryString.check.userAccount,
            [user.idCardNumber]
        ).rows[0].count;

        if (Number(countPerson) > 0) {
            throw new IdentityExistError(user.idCardNumber);
        }

        let personID = await q(
            queryString.create.person,
            [
                user.firstName,
                user.lastName,
                Number(user.gender),
                Number(user.namePrefix),
                user.idNumber
            ]
        ).rows[0].id;

        await q(
            queryString.create.userAccount,
            [
                user.username,
                user.password,
                Number(personID)
            ]
        );

        await q('commit');

        return 1;
    } catch (err) {
        await q('rollback');
        return new SigninError(err);
    }
}

module.exports = {
    doSignUp
};