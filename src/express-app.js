/**
 * @typedef {import('express').RequestHandler} RoutingHandlerCallback
 *  The way of handling HTTP request inside of this callback
 * @typedef {import('express').IRouterMatcher} RoutingHandlerMethod 
 *  Now using GET and POST methods for handling HTTP request
 * @typedef {Object<string,Array<RoutingHandlerCallback>>} RoutingHandlerMap
 *  An object for determining how to handle HTTP request.
 *      - The object keys represent the HTTP request path name
 *      - The object values are [RoutingHandlerCallback], or even the list of [RoutingHandlerCallback].
 * @typedef {Object} RoutingHandlerFullMap
 *  A bigger [RoutingHandlerMap] with HTTP methods organization
 * @property {RoutingHandlerMap} get A HTTP <GET> method [RoutingHandlerMap]
 * @property {RoutingHandlerMap} post A HTTP <POST> method [RoutingHandlerMap]
 */

const express = require('express');
const app = express();
const error = require('./error');
const cors = require('cors');

app.use(cors({
    origin: [
        'https://vaccine-rnc-webapp.herokuapp.com',
        'http://127.0.0.1:32853'
    ],
}));

let isRouteProvided = false;

/**
 * Determines how to respond the client request on that target URL path name
 * @param {RoutingHandlerFullMap} map
 */
function route(map) {
    for (let method of ['get', 'post'])
        for (let pathname in map[method]) {
            /** @type {RoutingHandlerMethod} */
            const f = app[method.toLowerCase()];
            /** @type {RoutingHandlerCallback} */
            const requestHandlers = map[method][path];
            if (!(requestHandlers instanceof Array)) continue;

            const param = [pathname];
            Array.prototype.push.apply(param, requestHandlers);

            f.apply(app, param);
        }
    isRouteProvided = true;
}

/**
 * Start the server
 */
function init() {
    if (!isRouteProvided) throw new error.RoutingRequiredError();

    app.listen(process.env.PORT, () => {
        console.log('App initialized.');
    });
}

module.exports = {
    route,
    init,
}