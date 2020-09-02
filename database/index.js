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
        o.exec().catch((err) => {
            if(typeof o.error == 'function') o.error(err);
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

        conn.on('error', function (err) {
            if (typeof error == 'function') error(err);
        });

        let result = await success(conn.query, conn);
        if (result instanceof Error) {
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

module.exports = {
    pool,
    doQuery
};