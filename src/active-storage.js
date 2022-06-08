const {
    encode,
} = require('./authorization');
const {
    LoginAuthenticationError,
    AuthorizationError
} = require('./error');
const { Readable } = require('stream');
const multer = require('multer');

/**
 * @typedef {Object<string, number>} MulterNamedField
 *  The keys of object represent the requested field names, and the values of object represent
 *  the maximum allowed instances for a field name.
 * 
 * @callback GoogleOAuthCallback
 * The callback that it will be executed after authorizing Google OAuth successfully .
 * @param {import('googleapis').oauth2_v2.Oauth2} auth
 */

/** @namespace */

/** Bytes number of a kilobyte */
const KB = 1024;
/** Bytes number of a megabyte */
const MB = 1048576;

const minutes = 60000;

/**
 * Active storage on Amazon Web Service
 */
const aws = (() => {
    const AWS = require('@aws-sdk/client-s3');


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

    const upload = multer({
        storage: multer.memoryStorage(),
        fileFilter(req, file, callback) {
            const currentTime = new Date();
            const Expires = new Date(currentTime.getTime() + 3 * minutes);
            const filename = currentTime.getTime();
            storage.send(new AWS.PutObjectCommand({
                Bucket,
                Key: `.temp/${filename}`,
                Body: file.buffer,
                Expires,
            }));

            setTimeout(function () {
                storage.send(new AWS.DeleteObjectCommand({
                    Bucket,
                    Key: `.temp/${filename}`,
                }));
            }, 3 * minutes);
            callback(null, true);
        },
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

    return {
        authentication: {
            put: putAuthInfo,
            get: getAuthInfo,
            remove: removeAuthInfo,
        },
        multer: {
            use: useMulter,
        },
    };
})();

/**
 * (Unsuccessful)
 * Active storage on Google Drive API
 */
const _google = (() => {
    const { google } = require('googleapis');

    let scope = ['https://www.googleapis.com/auth/drive.file'];
    const oAuth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_OAUTH_CLIENT_ID,
        process.env.GOOGLE_OAUTH_CLIENT_SECRET,
        `https://${process.env.HEROKU_APP_NAME}${process.env.DOMAIN_NAME}/google/auth`
    );
    console.log(
        process.env.GOOGLE_OAUTH_CLIENT_ID,
        process.env.GOOGLE_OAUTH_CLIENT_SECRET,
        process.env.HEROKU_APP_NAME,
        process.env.DOMAIN_NAME
    );
    const authCode = require('crypto').randomUUID();

    async function authorize() {
        const authUrl = oAuth2Client.generateAuthUrl({
            access_type: 'offline',
            scope,
            include_granted_scopes: true
        });
        const response = await oAuth2Client.getToken(authCode);
        oAuth2Client.setCredentials(response.tokens);
        console.log(oAuth2Client);
    }

    const upload = multer({
        storage: multer.memoryStorage(),
        fileFilter(req, file, callback) {
            const currentTime = new Date();
            // const expires = new Date(currentTime.getTime() + 3 * minutes);
            const filename = currentTime.getTime();

            authorize().then(async () => {
                const drive = google.drive({
                    version: 'v3',
                    auth: oAuth2Client,
                });

                const fields = `${process.GOOGLE_DRIVE_DIR}/.temp/${filename}`

                const FILE = await drive.files.create({
                    fields,
                    media: {
                        mimeType: file.mimetype,
                        body: file.buffer,
                    },
                });

                setTimeout(() => {
                    drive.files.delete({ fileId: FILE.data.id });
                }, 3 * minutes);

            });

            callback(null, true);
        },
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

        await authorize();

        try {
            const encoded = encode(username, iat);
            const drive = google.drive({
                version: 'v3',
                auth: oAuth2Client,
            });

            await drive.files.create({
                fields: `${process.GOOGLE_DRIVE_DIR}/authorization/${username}`,
                media: {
                    mimeType: 'text/plain',
                    body: `${encoded}`,
                },
            });

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

        await authorize();

        try {

            const drive = google.drive({
                version: 'v3',
                auth: oAuth2Client,
            });

            const response = await drive.files.get({
                fields: `${process.GOOGLE_DRIVE_DIR}/authorization/${username}`,
            });

            const fileRequest = require('https').request(response.data.webContentLink);

            /** @type {Buffer} */
            var buffer = await new Promise((resolve, reject) => {

                fileRequest.on('response', (readable) => {
                    readable.on('data', (chunck) => {
                        resolve(chunck);
                    });

                    readable.on('error', (err) => {
                        reject(err);
                    });
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
        await authorize();

        try {
            const drive = google.drive({
                version: 'v3',
                auth: oAuth2Client,
            });

            await drive.files.delete({
                fields: `${process.GOOGLE_DRIVE_DIR}/authorization/${username}`,
            });
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

    return {
        authentication: {
            put: putAuthInfo,
            get: getAuthInfo,
            remove: removeAuthInfo,
        },
        multer: {
            use: useMulter,
        },
    };

})();

/**
 * Active storage on local server
 */
const local = (() => {
    const AWS = require('@aws-sdk/client-s3');


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

    const upload = multer({
        storage: multer.memoryStorage(),
        fileFilter(req, file, callback) {
            const currentTime = new Date();
            const Expires = new Date(currentTime.getTime() + 3 * minutes);
            const filename = currentTime.getTime();
            storage.send(new AWS.PutObjectCommand({
                Bucket,
                Key: `.temp/${filename}`,
                Body: file.buffer,
                Expires,
            }));

            setTimeout(function () {
                storage.send(new AWS.DeleteObjectCommand({
                    Bucket,
                    Key: `.temp/${filename}`,
                }));
            }, 3 * minutes);
            callback(null, true);
        },
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

    return {
        authentication: {
            put: putAuthInfo,
            get: getAuthInfo,
            remove: removeAuthInfo,
        },
        multer: {
            use: useMulter,
        },
    };
})();


module.exports = { aws, google: _google };