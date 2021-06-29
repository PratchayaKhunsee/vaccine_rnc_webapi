const JWT = require('jsonwebtoken');
/**
 * @typedef {Object} JWTAuthenticationInfo
 * @property {String} username
 * @property {Number} iat
 */
/**
 * Decode authentication header to a readable object.
 * 
 * @param {String} authHeader The authorization header encoded by JSON web token
 */
function decode(authHeader) {
    const bearer = `${authHeader}`.split(' ');

    if (!(1 in bearer && bearer[0] == 'JWT')) {
        return null;
    }

    /** @type {JWTAuthenticationInfo} */
    const authInfo = JWT.verify(bearer[1], process.env.JWT_TOKEN_SECRET);

    return authInfo;
}

/**
 * Encode the information into JSON web token.
 * @param {String} username 
 * @param {Number} iat 
 */
function encode(username, iat){
    return JWT.sign({
        username,
        iat,
    }, process.env.JWT_TOKEN_SECRET);
}

module.exports = {
    encode,
    decode,
}