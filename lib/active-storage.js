const AWS = require('aws-sdk');
const {
    encode,
} = require('./authorization');
const { LoginAuthenticationError, AuthorizationError } = require('./error');

/** The authentication for login session storage */
const authStorage = new AWS.S3({
    credentials: {
        accessKeyId: process.env.AWS_S3_LOGINAUTH_ACCESS_KEY,
        secretAccessKey: process.env.AWS_S3_LOGINAUTH_SECRET_ACCESS_KEY,
    },
});

/**
 * Add the authorization JSON web token to the active storage.
 * 
 * @param {String} username 
 * @param {Number} iat
 * @returns {Promise<String>}
 */
function putJWTAuth(username, iat) {
    const encoded = encode(username, iat);
    return new Promise((resolve, reject) => {
        authStorage.putObject({
            Bucket: 'vaccine-vnc-app',
            Key: `authentication/${encoded}`,
        }).on('success', function(){
            resolve(encoded);
        }).on('error', function(){
            reject(new LoginAuthenticationError);
        });
    });
}

/**
 * Remove the authorization JSON web token from the active storage.
 * @param {String} token
 * @returns {Promise<null>} 
 */
function removeJWTAuth(token) {
    return new Promise(function(resolve, reject){
        authStorage.deleteObject({
            Bucket: 'vaccine-vnc-app',
            Key: `authentication/${token}`,
        }).on('success', function(){
            resolve(null);
        }).on('error', function(){
            reject(new AuthorizationError);
        });
    });
}

/**
 * Find the authorization JSON web token from the active storage.
 * @param {String} token 
 * @returns {Promise<String>}
 */
function getJWTAuth(token) {
    return new Promise(function(resolve, reject){
        authStorage.getObject({
            Bucket: 'vaccine-vnc-app',
            Key: `authentication/${token}`,
        }).on('success', function(res){
            resolve(String(res.data.Body));
        }).on('error', function(){
            reject(new AuthorizationError);
        });
    });
}

module.exports = {
    authentication: {
        put: putJWTAuth,
        get: getJWTAuth,
        remove: removeJWTAuth,
    },
};