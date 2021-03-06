/**
 * @typedef {import('express').RequestHandler} RoutingHandlerCallback
 *  The way of handling HTTP request inside of this callback
 * @typedef {import('express').IRouterMatcher} RoutingHandlerMethod 
 *  Now using GET and POST methods for handling HTTP request
 * @typedef {Object<string,Array<RoutingHandlerCallback>>} RoutingHandlerMap
 *  An object for determining how to handle HTTP request.
 *      - The object keys represent the HTTP request path name
 *      - The object values are [RoutingHandlerCallback] or the list of [RoutingHandlerCallback].
 * @typedef {Object} RoutingHandlerFullMap
 *  A bigger [RoutingHandlerMap] with HTTP methods organization
 * @property {RoutingHandlerMap} GET A HTTP <GET> method [RoutingHandlerMap]
 * @property {RoutingHandlerMap} POST A HTTP <POST> method [RoutingHandlerMap]
 */

const express = require('express');
const app = express();
const error = require('./error');
const cors = require('cors');
const ActiveStorage = require('./active-storage').aws;

app.use(cors());

let isRouteProvided = false;

/**
 * Determines how to respond the client request on that target URL path name
 * @param {RoutingHandlerFullMap} map
 */
function route(map) {

    for (let method of ['GET', 'POST']) {
        for (let pathname in map[method]) {
            /** @type {RoutingHandlerMethod} */
            const f = app[method.toLowerCase()];

            /** @type {RoutingHandlerCallback[]} */
            const requestHandlers = map[method][pathname];
            if (!(requestHandlers instanceof Array)) continue;

            if (f === app.get) app.get(pathname, ...requestHandlers);
            if (f === app.post) app.post(pathname, ...requestHandlers);
        }
    }
    isRouteProvided = true;
}

/**
 * Start the server
 */
function init() {
    const ROUTING_REQUIRED_ERROR = new error.RoutingRequiredError();
    if (!isRouteProvided) throw ROUTING_REQUIRED_ERROR;

    app.listen(process.env.PORT, () => {
        console.log('App initialized.');
    });
}

const acceptJson = () => express.json();
/**
 * 
 * @param {Array<import('multer').Field>} [fields] 
 * @returns 
 */
const acceptFormData = (fields) => ActiveStorage.multer.use(fields);

module.exports = {
    route,
    init,
    acceptJson,
    acceptFormData,
}