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

const types = require("pg").types;
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
    // bytea: value => value !== null ? btoa(value) : null,
}

for(let type in typeParser){
    types.setTypeParser(OID.datatype[type], typeParser[type]);
}

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
 * Attempt to use database connection with limited.
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
    maxConnection: 20,
    /** @type {(()=>{})[]} */
    queue: [],
    async use() {
        this.connection++;
        if (this.connection > this.maxConnection) {
            await new Promise(function (resolve) {
                queue.push(resolve);
            });
        }
    },
    async release() {
        this.connection--;
        if (this.queue.length > 0) {
            this.queue.shift()();
        }
    }
}
/**
 * 
 * @param {QueryAsyncFunction} done 
 * @param {ErrorCallback} fallback 
 */
async function connect(done, fallback) {

    if (typeof done != 'function') throw null;
    let connectionUsed = false;

    try {
        const conn = new Client({
            connectionString: process.env.DATABASE_URL,
            ssl: {
                rejectUnauthorized: false
            }
        });

        await conn.connect();
        await o.use();
        connectionUsed = true;
        let result = await done(conn);
        await conn.end();
        await o.release();
        connectionUsed = false;
        return result;
    } catch (error) {
        if (connectionUsed) {
            await o.release();
        }
        if (typeof fallback == 'function') fallback(error);
        throw error;
    }
}

module.exports = {
    pool,
    doQuery,
    connect,
};