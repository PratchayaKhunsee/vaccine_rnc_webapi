const filetype = require('file-type');

/**
 * Get the mime type from the input bytes list.
 * @param {*} value Preferred an iterable object or a string.
 * @returns {Promise<String>} The resolved value can be null if there is no mime type detected.
 */
async function getMime(value) {
    if (value === null || value === undefined) {
        return null;
    }
    
    if (typeof value == 'string') {
        return (await filetype.fromBuffer(Uint8Array.from(value.split('').map(x => String(x).charCodeAt(0)))) || {}).mime || null;
    }

    if (typeof value[Symbol.iterator] == 'function') {
        return (await filetype.fromBuffer(Uint8Array.from(value)) || {}).mime || null;
    }

    return null;
}

module.exports = {
    get: getMime,
}