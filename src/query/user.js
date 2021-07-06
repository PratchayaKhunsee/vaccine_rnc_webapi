/**
 * @typedef {Object} UserEditableInfo
 * 
 * Allowed editable user information
 * 
 * @property {String} [firstname]
 * @property {String} [lastname]
 * @property {Number} [gender]
 * @property {Number} [name_prefix]
 * 
 * @typedef {Object} UserInfo
 * 
 * A user information.
 * 
 * @property {String} firstname
 * @property {String} lastname
 * @property {Number} gender
 * @property {Number} name_prefix
 * 
 * @typedef {Object} PasswordModifier
 * 
 * Optional; Password modifier object
 * 
 * @property {String} old
 * @property {String} new
 */

/** @namespace */

const { QueryResultError, } = require('../error');

/**
 * List of editable user infomation attributes
 */
const editableAttr = [
    'firstname',
    'lastname',
    'gender',
    'name_prefix'
];

// =====================================

/**
 * Logs in to the account
 * @param {import('pg').Client} client
 * @param {String} username 
 * @param {String} password 
 */
async function logIn(client, username, password) {
    try {
        const USER_NOT_FOUND = new QueryResultError('USER_NOT_FOUND'),
            PASSWORD_INCORRECT = new QueryResultError('PASSWORD_INCORRECT');

        if (!(username && password)) {
            throw USER_NOT_FOUND;
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
            throw PASSWORD_INCORRECT;
        }

        let person = await client.query(
            "SELECT * FROM person WHERE id = $1",
            [
                Number(userAccount.rows[0].person_id)
            ]
        );

        if (person.rows.length != 1) {
            throw new QueryResultError('USER_NOT_FOUND');
        }

        await client.query('COMMIT');
        return true;
    } catch (error) {
        await client.query('ROLLBACK');
        throw QueryResultError.unexpected(error);
    }
}

/**
 * Create new user account.
 * 
 * @param {import("pg").Client} conn
 * @param {UserData} user
 */
async function signUp(conn, user) {

    try {
        const USERNAME_EXIST = new QueryResultError('USERNAME_EXIST');
        await conn.query('BEGIN');
        /**
         * Result of creating a user account.
         */
        let person = await conn.query(
            "INSERT INTO person (firstname,lastname,gender,name_prefix) VALUES($1,$2,$3,$4) RETURNING id",
            [
                user.firstname,
                user.lastname,
                Number(user.gender),
                Number(user.name_prefix)
            ]
        );

        /**
         * Result of creating a person information field.
         */
        let account = await conn.query(
            "INSERT INTO user_account (username, password, person_id) VALUES($1, crypt($2, gen_salt('md5')), $3) RETURNING id",
            [
                user.username,
                user.password,
                Number(person.rows[0].id)
            ]
        );

        // Cannot created a user account if username is redundant.
        if (account.rowCount != 1) {
            throw USERNAME_EXIST;
        }

        await conn.query('COMMIT');

        return true;
    } catch (error) {
        await conn.query('ROLLBACK');
        throw QueryResultError.unexpected(error);
    }
}

/**
 * Get the personal information
 * 
 * @param {import('pg').Client} client
 * @param {String} username 
 */
async function viewUser(client, username) {
    try {
        // Check the user information by username
        let user = await client.query(
            'SELECT person_id FROM user_account WHERE username = $1',
            [
                String(username)
            ]
        );
        if (user.rows.length != 1) {
            return {};
        }

        // Get the personal information with person information
        let person = await client.query(
            'SELECT firstname,lastname,gender,name_prefix FROM person WHERE id = $1',
            [
                Number(user.rows[0].person_id)
            ]
        );

        if (person.rows.length != 1) {
            return {};
        }

        /** @type {UserInfo} */
        const result = { ...person.rows[0], };

        return result;
    } catch (error) {
        throw QueryResultError.unexpected();
    }


}

// =====================================

/**
 * Edit some user information
 * @param {import('pg').Client} client
 * @param {String} username  
 * @param {UserEditableInfo} info
 */
async function editUserInfo(client, username, info) {

    try {
        let cloned = { ...info };
        for (let attr in cloned) {
            if (!editableAttr.find(_attr => _attr == attr)) delete info[attr];
        }
        const USER_INFO_MODIFYING_FAILED = new QueryResultError('USER_INFO_MODIFYING_FAILED');

        await client.query('BEGIN');

        // Get the user information with username
        let user = await client.query(
            'SELECT person_id FROM user_account WHERE username = $1',
            [
                String(username)
            ]
        );

        // No need to update if it has no found user
        if (user.rows.length != 1) {
            throw USER_INFO_MODIFYING_FAILED;
        }

        // Updating user information.
        if (info) {
            let keys = Object.keys(cloned);
            let values = [
                ...(Object.values(cloned)),
                Number(user.rows[0].person_id)
            ];

            let i = 1;
            let queryString = `UPDATE person SET ${keys.map(x => `${x} = $${i++}`)} WHERE id = $${i} RETURNING firstname,lastname,gender,name_prefix`;
            var updating = await client.query(
                queryString,
                values
            );

            // Cancel the user information updating if it has caught an error
            if (updating.rowCount != 1) {
                throw USER_INFO_MODIFYING_FAILED;
            }
        } else {
            throw USER_INFO_MODIFYING_FAILED;
        }

        await client.query('COMMIT');

        /** @type {UserInfo} */
        const result = { ...updating.rows[0] };

        return result;
    } catch (error) {
        await client.query('ROLLBACK');
        
        throw QueryResultError.unexpected(error);
    }

}

/**
 * Edit user account information like password.
 * 
 * @param {import('pg').Client} client
 * @param {String} username  
 * @param {PasswordModifier} password 
 */
async function editUserAccount(client, username, password) {
    try {
        const USER_INFO_MODIFYING_FAILED = new QueryResultError('USER_PASSWORD_CHANGING_FAILED');

        await client.query('BEGIN');

        let modified = await client.query(
            `UPDATE user_account SET password = crypt($1, gen_salt('md5')) WHERE username = $2 AND password = crypt($3, password)`,
            [
                (password || {}).new,
                username,
                (password || {}).old
            ]
        );

        if (modified.rowCount != 1) {
            throw new USER_INFO_MODIFYING_FAILED;
        }

        await client.query('COMMIT');

        return true;
    } catch (error) {
        await client.query('ROLLBACK');
        console.log(`Edit user account error:`, error);
        throw QueryResultError.unexpected(error);
    }

}

// =====================================

/** Exported modules */
module.exports = {
    viewUser,
    editUserInfo,
    editUserAccount,
    logIn,
    signUp,
}