const AWS = require('@aws-sdk/client-s3');
const { Readable } = require('stream');
const multer = require('multer');
const stream = require('stream');

const {
    encode,
} = require('./authorization');
const {
    LoginAuthenticationError,
    AuthorizationError
} = require('./error');

/**
 * @typedef {Object<string, number>} MulterNamedField
 *  The keys of object represent the requested field names, and the values of object represent
 *  the maximum allowed instances for a field name.  
 */

/** @namespace */

/** Bytes number of a kilobyte */
const KB = 1024;
/** Bytes number of a megabyte */
const MB = 1048576;

// const minutes = 60000;

const Region = 'ap-southeast-1';
const Bucket = 'vaccine-rnc-app';

/** The authentication for login session storage */
const storage = new AWS.S3Client({
    region: Region,
    credentials: {
        accessKeyId: process.env.AWS_S3_ACCESS_KEY,
        secretAccessKey: process.env.AWS_S3_SECRET_ACCESS_KEY,
    }
});

/** @class */
function S3StorageEngine() { }

S3StorageEngine.prototype._handleFile = function (req, file, callback) {
    const currentTime = new Date();
    const filename = currentTime.getTime();

    // /** @type {import('fs').ReadStream} */
    // const stream = file.stream;


    console.log("Request: ", req);
    console.log("File:", file.stream, file.stream.pipe);

    // var outStream = fs.createWriteStream(path)

    // file.stream.pipe(outStream)
    // outStream.on('error', cb)
    // outStream.on('finish', function () {
    //   cb(null, {
    //     path: path,
    //     size: outStream.bytesWritten
    //   })
    // })
    storage.send(new AWS.PutObjectCommand({
        Bucket,
        Key: `.temp/${filename}`,
        Body: file.buffer,
    })).then(function (output) {
        console.log("PutObjectResult:", output);
        callback(null, file);
    }).catch(function (err) {
        console.log('Error:', err);
        callback(`.temp/${filename}`, null);
    });
}

S3StorageEngine.prototype._removeFile = function (req, Key, callback) {
    storage.send(new AWS.DeleteObjectCommand({
        Bucket,
        Key,
    })).then(function (output) {
    }).catch(function (err) {
    }).finally(function () {
        callback(null, null);
    });
}

const upload = multer({
    storage: new S3StorageEngine(),
    // fileFilter(req, file, callback) {
    //     const currentTime = new Date();
    //     const Expires = new Date(currentTime.getTime() + 3 * minutes);
    //     const filename = currentTime.getTime();
    //     storage.send(new AWS.PutObjectCommand({
    //         Bucket,
    //         Key: `.temp/${filename}`,
    //         Body: file.buffer,
    //         Expires,
    //     }));

    //     setTimeout(function () {
    //         storage.send(new AWS.DeleteObjectCommand({
    //             Bucket,
    //             Key: `.temp/${filename}`,
    //         }));
    //     }, 3 * minutes);
    //     callback(null, true);
    // },
    limits: {
        fieldSize: 1 * KB,
        fileSize: 3 * MB,
    },
})

/**
 * Add the authorization JSON web token to the active storage.
 * 
 * @param {String} username 
 * @param {Number} iat
 */
async function putAuthInfo(username, iat) {
    const LOGIN_AUTHENTICATION_ERROR = new LoginAuthenticationError;
    try {
        const encoded = encode(username, iat);

        await storage.send(new AWS.PutObjectCommand({
            Bucket: Bucket,
            Key: `authorization/${username}`,
            Body: `${encoded}`,
        }));

        return encoded;
    } catch (error) {
        throw LOGIN_AUTHENTICATION_ERROR;
    }
}

/**
 * Find the authorization JSON web token from the active storage.
 * @param {String} username The user name
 * @param {String} auth The json web token for authorization
 */
async function getAuthInfo(username, auth) {
    const AUTHORIZATION_ERROR = new AuthorizationError;
    if (!auth) throw AUTHORIZATION_ERROR;

    try {

        const output = await storage.send(new AWS.GetObjectCommand({
            Bucket: Bucket,
            Key: `authorization/${username}`,
        }));
        /** @type {Readable} */
        const readable = output.Body;
        // readable.read();

        /** @type {Buffer} */
        var buffer = await new Promise((resolve, reject) => {
            readable.on('data', (chunck) => {
                resolve(chunck);
            });

            readable.on('error', (err) => {
                reject(err);
            });
        });

        const result = buffer.toString('utf-8');

        return result == auth;
    } catch (error) {
        throw AUTHORIZATION_ERROR;
    }
}

/**
 * Remove the authorization JSON web token from the active storage.
 * @param {String} username
 */
async function removeAuthInfo(username) {
    try {
        await storage.send(new AWS.DeleteObjectCommand({
            Bucket: Bucket,
            Key: `authorization/${username}`,
        }));
        return true;
    } catch (error) {
        throw false;
    }
}

/**
 * 
 * @param {Array<import('multer').Field>} [fields] 
 * @returns 
 */
function useMulter(fields) {
    return fields ? upload.fields(fields) : upload.any();
}

module.exports = {
    authentication: {
        put: putAuthInfo,
        get: getAuthInfo,
        remove: removeAuthInfo,
    },
    multer: {
        use: useMulter,
    },
};