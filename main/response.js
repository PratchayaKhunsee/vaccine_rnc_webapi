/**
 * @typedef {import('express').RequestHandler} RequestHandler
 */
/**
 * The HTTP status codes.
 */
const httpStatus = {
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    OK: 200,
    CREATED: 201,
    NO_CONTENT: 204,
};

/**
 * Create a callback that it can respond a JSON content.
 * @function
 * @param {Number} statusCode 
 */
const createJSONResponse = function (statusCode) {
    /** @type {RequestHandler} */
    const cb = (req, res, next, content) => {
        res.set({
            'Content-Type': 'application/json'
        });
        res.status(statusCode);
        res.send(JSON.stringify(content) || '{}');
    };
    return cb;
};

/**
 * The JSON response handlers object.
 */
const response = {
    /**
     * Response to the request with [UNAUTHORIZED] HTTP status code.
     **/
    unauthorized: createJSONResponse(httpStatus.UNAUTHORIZED),
    /**
     * Response to the request with [NOT_FOUND] HTTP status code.
     **/
    contentNotFound: createJSONResponse(httpStatus.NOT_FOUND),
    /**
     * Response to the request with [OK] HTTP status code.
     **/
    ok: createJSONResponse(httpStatus.OK),
    /**
     * Response to the request with [CREATED] HTTP status code.
     **/
    created: createJSONResponse(httpStatus.CREATED),
    /**
     * Response to the request with [BAD_REQUEST] HTTP status code.
     **/
    badRequest: createJSONResponse(httpStatus.BAD_REQUEST),
    /**
     * Response to the request with [NO_CONTENT] HTTP status code.
     */
    noContent: createJSONResponse(httpStatus.NO_CONTENT),
};

module.exports = response;