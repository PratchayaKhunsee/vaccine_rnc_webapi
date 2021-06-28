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
    try {
        const encoded = encode(username, iat);

        const output = await authStorage.send(new AWS.PutObjectCommand({
            Bucket: Bucket,
            Key: `authorization/${username}`,
            Body: `${encoded}`,
        }));

        return encoded;
    } catch (error) {
        throw new LoginAuthenticationError;
    }
}

/**
 * Find the authorization JSON web token from the active storage.
 * @param {String} username The user name
 * @param {String} auth The json web token for authorization
 */
async function getAuthInfo(username, auth) {
    if (!auth) throw AuthorizationError;

    try {
        
        const output = await authStorage.send(new AWS.GetObjectCommand({
            Bucket: Bucket,
            Key: `authorization/${username}`,
        }));
        /** @type {Readable} */
        const readable = output.Body;
        // readable.read();

        console.log(readable.read(), auth);

        return output.Body == auth;
    } catch (error) {
        throw new AuthorizationError;
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