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
 * @param {Client} connect
 * @returns {Promise}
 * 
 * @callback ErrorCallback
 * @param {*} error
 * 
 * @typedef {Object} QueuedQuery
 * @property {AsyncFunction} exec
 * @property {ErrorCallback} error
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

/** @type {Array<QueuedQuery>} */
let queue = [];
let counter = {
    connection: 0,
}

function dequeueAll() {
    while (queue.length > 0) {
        let o = queue.shift();
        o.exec()
            .catch((err) => {
                if (typeof o.error == 'function') o.error(err);
            });
    }
}

/**
 * 
 * @param {QueryAsyncFunction} success
 * @param {ErrorCallback} error
 */
function doQuery(success, error) {
    const exec = async () => {
        counter.connection++;
        const conn = new Client({
            connectionString: process.env.DATABASE_URL,
            ssl: {
                rejectUnauthorized: false
            }
        });

        await conn.connect();

        let result = await success(conn);
        if (result instanceof Error) {
            await conn.end();
            throw result;
        }
        await conn.end();
        counter.connection--;
    };

    dequeueAll();
    if (counter.connection < 20) {
        exec()
            .catch(x => {
                if (typeof error == 'function') error(x);
            });
    } else {
        queue.push({
            exec,
            error
        });
    }
}

let o = {
    connection: 0,
}
/**
 * 
 * @param {QueryAsyncFunction} done 
 * @param {*} fallback 
 */
async function connect(done, fallback) {

    if(typeof done != 'function') return null;

    const conn = new Client(
        {
            connectionString: process.env.DATABASE_URL,
            ssl: {
                rejectUnauthorized: false
            }
        }
    );

    await conn.connect();
    o.connection++;
    let result = await done(conn);
    await conn.end();
    o.connection--;

    return result;
}

module.exports = {
    pool,
    doQuery,
    connect,
};