const pool = require("../database");
const idValidator = require("thai-id-card");
const {
    UserNameExistError,
    IdentityExistError,
    InvalidIdNumberError,
    EmptyInputError
} = require("../error");

module.exports = signin;

/**
 * @typedef {Object} UserData
 * @property {String} firstName
 * @property {String} lastName
 * @property {String} username
 * @property {String} password
 * @property {Number|BigInt} namePrefix
 * @property {String[13]} idCardNumber
 * @property {Number|BigInt} gender 
 */
/**
 * @param {UserData} userData
 * @returns {1} 
 */
function signin(userData) {
    for (let name in userData) {
        if (!userData[name]) {
            return new EmptyInputError();
        }
    }

    if (!idValidator.verify(userData.idCardNumber)) {
        return new InvalidIdNumberError(userData.idCardNumber);
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
        (async () => {
            await pool.query('begin');

            let countUser = await (await pool.query(
                queryString.check.userAccount,
                [userData.username]
            )).rows[0].count;

            if (Number(countUser) > 0) {
                throw new UserNameExistError(userData.username);
            }

            let countPerson = await (await pool.query(
                queryString.check.userAccount,
                [userData.idCardNumber]
            )).rows[0].count;

            if (Number(countPerson) > 0) {
                throw new IdentityExistError(userData.idCardNumber);
            }

            let personID = await (await pool.query(
                queryString.create.person,
                [userData.firstName, userData.lastName, userData.gender, userData.namePrefix, userData.idCardNumber]
            )).rows[0].id;

            await pool.query(
                queryString.create.userAccount,
                [userData.username, userData.password, personID]
            );

            await pool.query('commit');

            return 1;
        })();
    } catch (err) {
        await pool.query('rollback');
        return err;
    }
}