const errorCodes = require('./request-response-rules').errorResponseCode;


/**
 * @typedef {'USER_NOT_FOUND'|'PASSWORD_INCORRECT'|'USERNAME_EXIST'|'USER_INFO_MODIFYING_FAILED'|'USER_PASSWORD_CHANGING_FAILED'|'RECORD_CREATING_FAILED'|'RECORD_MODIFYING_FAILED'|'PATIENT_CREATING_FAILED'|'PATIENT_SELF_CREATING_FAILED'|'PATIENT_MODIFYING_FAILED'|'CERTIFICATE_CREATING_FAILED'|'CERTIFICATE_MODIFYING_FAILED'|'CERTIFICATE_HEADER_MODIFYING_FAILED'} QueryResultErrorList
 *  The querying result error list
 **/
/**
 * The map of error names that bind to the route names
 */
const errorCodeRoutes = {
    'USER_NOT_FOUND': 'login',
    'PASSWORD_INCORRECT': 'login',
    'USERNAME_EXIST': 'signup',
    'USER_INFO_MODIFYING_FAILED': 'user/edit/info',
    'USER_PASSWORD_CHANGING_FAILED': 'user/edit/account',
    'RECORD_CREATING_FAILED': 'record/create',
    'RECORD_MODIFYING_FAILED': 'record/edit',
    'PATIENT_CREATING_FAILED': 'patient/create',
    'PATIENT_SELF_CREATING_FAILED': 'patient/create/self',
    'PATIENT_MODIFYING_FAILED': 'patient/edit',
    'CERTIFICATE_CREATING_FAILED': 'certificate/create',
    'CERTIFICATE_MODIFYING_FAILED': 'certificate/edit',
    'CERTIFICATE_HEADER_MODIFYING_FAILED': 'certificate/edit/header',
};

/**
 * The instance for representing the querying result error.
 */
class QueryResultError extends Error {
    /**
     * The name of query result error.
     * @type {QueryResultErrorList}
     */
    name;
    /**
     * The query result error code.
     * @type {Number}
     **/
    code;
    /**
     * @param {QueryResultErrorList} [cause] 
     */
    constructor(cause) {
        super();
        if (cause in errorCodeRoutes) {
            this.code = errorCodes[errorCodeRoutes[cause]][cause];
            this.name = cause;
        }

        else {
            this.code = NaN;
            this.name = 'UNEXPECTED_ERROR';
        }
    }
    /**
     * Return an object containing error code and error name.
     **/
    toObject(){
        return {
            name: this.name,
            errorCode: this.code,
        };
    }
    /**
     * Return [QueryResultError] with UNEXPECTED_ERROR if there is no [QueryResultError]
     * @param {QueryResultError} [error] 
     * @returns {QueryResultError}
     */
    static unexpected(error){
        return error instanceof QueryResultError ? error : new QueryResultError();
    }
}
/**
 * The instance for representing the login authentication error.
 */
class LoginAuthenticationError extends Error{
    constructor(){
        super('Login authentication failed');
    }
}
/**
 * The instance for representing the authorization error.
 */
class AuthorizationError extends Error{
    constructor(){
        super('Authorization failed.')
    }
}

/**
 * The instance for representing the error of not doing routing by calling routes() function.
 */
 class RoutingRequiredError extends Error {
    constructor() {
        super('Routing is required.');
    }
}

module.exports = {
    QueryResultError,
    LoginAuthenticationError,
    AuthorizationError,
    RoutingRequiredError,
};