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
        if (obj === null || typeof obj !== 'object') {
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
        const hasAttributes = typeof attributes == 'object';
        const hasFilename = hasAttributes && typeof attributes.filename == 'string' && attributes.filename != '';
        const hasHeaders = hasAttributes && typeof attributes.headers == 'object';
        const CRLF = '\r\n';
        this.#content += `--${this.#boundary}${CRLF}`;
        this.#content += `Content-Disposition: form-data; name="${name}"` + (hasFilename ? `; filename="${attributes.filename}"` : '');

        
        if (hasHeaders) {
            for (let h in attributes.headers) {
                let v = attributes.headers[h];
                if (v && v != '') this.#content += `${CRLF}${h}: ${v}`;
            }
        }

        var v = value;
        if (MultipartResponse.#isIterable(v)) {
            if (hasFilename) {
                
                this.#content += `${CRLF}Content-Transfer-Encoding: binary`;
                v = Buffer.from(v).toString('binary');
                console.log(v);
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
        this.#stream = stream instanceof Buffer ? stream.map(v => String.fromCharCode(v)).join('') : String(stream);
    }
}

module.exports = { MultipartResponse, MultipartReader, };