/**
 * @callback PgQueryMethod
 * @param {String} queryString
 * @param {Array} [values]
 * @returns {Promise<import('pg').QueryResult>}
 * 
 * @callback AsyncFunction
 * @returns {Promise}
 * 
 * @callback QueryAsyncFunction
 * @param {PgQueryMethod} query
 * @param {Client} connect
 * @returns {Promise}
 */
const {
    Pool,
    Client
} = require("pg");
// Future use this pooling connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

/** @type {Array<AsyncFunction>} */
let queue = [];
let counter = {
    connection: 0,
}

async function dequeueAll() {
    while (queue.length > 0) {
        await queue.shift()();
    }
}

/**
 * 
 * @param {QueryAsyncFunction} success
 */
async function doQuery(success) {
    const exec = async function () {
        counter.connection++;
        const conn = new Client({
            connectionString: process.env.DATABASE_URL,
            ssl: {
                rejectUnauthorized: false
            }
        });

        conn.on('error', function (err) {
            throw err;
        });

        await success(conn.query, conn);
        await conn.end();
        counter.connection--;
    };

    await dequeueAll();
    if (counter.connection < 20) {
        await exec();
    } else {
        queue.push(exec);
    }
}

module.exports = {
    pool,
    doQuery
};