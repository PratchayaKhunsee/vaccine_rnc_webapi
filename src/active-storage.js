const AWS = require('@aws-sdk/client-s3');
const { Readable } = require('stream');
const {
    encode,
} = require('./authorization');
const {
    LoginAuthenticationError,
    AuthorizationError
} = require('./error');

const Region = 'ap-southeast-1';
const Bucket = 'vaccine-rnc-app';

/** The authentication for login session storage */
const authStorage = new AWS.S3Client({
    region: Region,
    credentials: {
        accessKeyId: process.env.AWS_S3_LOGINAUTH_ACCESS_KEY,
        secretAccessKey: process.env.AWS_S3_LOGINAUTH_SECRET_ACCESS_KEY,
    }
});

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

        const output = await authStorage.send(new AWS.PutObjectCommand({
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

        const output = await authStorage.send(new AWS.GetObjectCommand({
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
 * @param {String} auth
 */
async function removeAuthInfo(username, auth) {
    try {
        const output = await authStorage.send(new AWS.DeleteObjectCommand({
            Bucket: Bucket,
            Key: `authorization/${username}`,
        }));
        return true;
    } catch (error) {
        throw false;
    }
}

module.exports = {
    authentication: {
        put: putAuthInfo,
        get: getAuthInfo,
        remove: removeAuthInfo,
    },
};