const crypto = require('crypto');

/**
 * An instance for handling the "multipart/form-data" response.
 */
class MultipartResponse {
    /** @type {import("express").Response} */
    #response;
    #boundary;
    #content = "";

    get length() {
        return this.#content.length;
    }

    static #isIterable = function (obj) {
        // checks for null and undefined
        if (obj === null) {
            return false;
        }
        return typeof obj[Symbol.iterator] === 'function';
    }

    /**
     * @param {import("express").Response} res 
     */
    constructor(res) {
        this.#response = res;
        this.#boundary = crypto.randomUUID();
    }

    /**
     * 
     * @param {String} name 
     * @param {*} value 
     */
    append(name, value, attributes = {
        filename: "",
        headers: {},
    }) {
        const CRLF = '\r\n';
        this.#content += `--${this.#boundary}${CRLF}`;
        this.#content += `Content-Disposition: form-data; name="${name}"`, attributes && attributes.filename ? `; filename="${attributes.filename}"` : '';

        if (typeof attributes.headers == 'object') {
            for (let a in attributes.headers) {
                let v = attributes.headers[a];
                if (v && v != '') this.#content += `${CRLF}${h}: ${v}`;
            }
        }

        var v = value;
        if (MultipartResponse.#isIterable(v)) {
            if (filename && filename != '') {
                v = Array.from(v).map(x => String.fromCharCode(x)).join('') || null;
            }

            else {
                v = Array.from(v).join(',') || null;
            }
        }
        this.#content += `${CRLF}${CRLF}${v}`;
        this.#content += CRLF;

        return this;
    }

    finalize() {
        const CRLF = '\r\n';
        this.#content += `--${this.#boundary}--${CRLF}`;
        this.#response.header({
            'Content-Type': `multipart/form-data; boundary=${this.#boundary}`,
        });
        this.#response.write(this.#content);

        return this;
    }

    end() {
        this.#response.end();
    }
}


class MultipartReader {
    /** @type {String} */
    #stream;
    /**
     * 
     * @param {String|Buffer} stream 
     */
    constructor(stream) {
        this.#steam = stream instanceof Buffer ? stream.map(v => String.fromCharCode(v)).join('') : String(stream);
    }
}

module.exports = { MultipartResponse, MultipartReader, };