
const {
    Client
} = require("pg");

const types = require('pg').types;
const OID = {
    datatype: {
        bytea: 17,
        int8: 20,
        date: 1082,
        time: 1083,
        timestamp: 1114,
        timestamptz: 1184,
    }
};

const typeParser = {
    int8: value => value !== null ? parseInt(value) : null,
    bytea: value => value !== null ? Buffer.from(value).toString('base64') : null,
}

for (let type in typeParser) {
    types.setTypeParser(OID.datatype[type], typeParser[type]);
}

/**
 * @callback ReleaseCallback
 * @param {*} value
 * @returns {void}
 * 
 * @callback AsyncDatabaseConnectionCallback
 * @param {import('pg').Client} client
 * @returns {Promise<*>}
 */

/** The maximum number of database connection */
const connectionLimit = 10;
/** The amount of current database connection */
let currentConnections = 0;
/**
 * The waiting connection locks
 * @type {ReleaseCallback[]}
 **/
const waitingConnection = [];

function releaseOnce() {
    --currentConnections;
    if (waitingConnection.length > 0) {
        waitingConnection.shift()();
    }
}

/**
 * Perform doing query asynchronously.
 * 
 * @param {AsyncDatabaseConnectionCallback} callback 
 */
async function query(callback) {
    ++currentConnections;

    const _callback = async function () {
        const conn = new Client({
            connectionString: process.env.DATABASE_URL,
            ssl: {
                rejectUnauthorized: false,
            }
        });


        var result;
        var error;

        try {
            await conn.connect();
            result = await callback(conn);
            await conn.end();
        } catch (e) {
            error = e;
        }

        releaseOnce();

        if (error) {
            console.log('Database Caught: ', error);
            throw error;
        }
        return result;
    }

    if (currentConnections > connectionLimit) {
        await new Promise(function (resolve) {
            waitingConnection.push(resolve);
        });
    }

    return await _callback();
}

module.exports = {
    query,
};