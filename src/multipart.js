const crypto = require('crypto');

/**
 * @typedef {Object} FieldAttributes
 * @property {String} [filename]
 * @property {'non-file'|'file'} [type='non-file']
 * @property {Object<string,string>} [headers]
 */

/** @namespace */


const CRLF = '\r\n';
function isIterable(obj) {
    // checks for null and undefined
    if (obj === null || typeof obj !== 'object') {
        return false;
    }
    return typeof obj[Symbol.iterator] === 'function';
}

/**
 * 
 * @param {String[]} array 
 */
function charArray2IntArray(array) {
    return Array.from(array).map(x => x.charCodeAt(0));
}

class Field {
    /** @type {Boolean} */
    #isFile;
    /** @type {String} */
    #fieldname;
    /** @type {*} */
    #payload;
    /** @type {Object<string, string>} */
    #headers;
    /** @type {String} */
    #filename;

    constructor(fieldname, payload, headers, isFile = false, filename) {
        if (arguments.length < 2) throw new Error('Need a payload and a field name.');
        this.#fieldname = String(fieldname);
        this.#payload = payload;
        this.#isFile = isFile === true;
        this.#headers = typeof headers == 'object' && headers !== null ? headers : {};
        this.#filename = typeof filename == 'string' ? filename : null;
    }

    toBuffer() {
        let fieldInfo = `Content-Disposition: form-data; name="${this.#fieldname}"` + (this.#filename ? `; filename="${this.#filename}"` : '');
        let fieldHeaders = "";
        for (let e of Object.entries(this.#headers)) {
            if (e[0] != '' && e[1] != '') fieldHeaders += `${CRLF}${e[0]}: ${e[1]}`;
        }

        let payload = this.#payload;

        if (isIterable(payload)) {
            if (this.#isFile) {
                payload = Buffer.from(payload);
            }

            else {
                payload = Array.from(payload).join(',') || null;
            }
        }

        const intArray = [
            ...charArray2IntArray(fieldInfo),
            ...charArray2IntArray(fieldHeaders),
        ];

        intArray.push(...charArray2IntArray(`${CRLF}${CRLF}`));
        if (this.#isFile && payload instanceof Buffer) {
            intArray.push(...Array.from(payload));
        } else {
            intArray.push(...charArray2IntArray(String(payload)));
        }

        intArray.push(...charArray2IntArray(CRLF));

        return Buffer.from(intArray);
    }
}

/**
 * An instance for handling the "multipart/form-data" response.
 */
class MultipartResponse {
    /** @type {import("express").Response} */
    #response;
    #boundary;
    // #content = "";
    /** @type {Field[]} */
    #fields = [];

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
     * @param {FieldAttributes} [attributes]
     */
    append(name, value, attributes = {
        type: 'non-file',
        filename,
        headers,
    }) {
        const hasAttributes = typeof attributes == 'object';
        this.#fields.push(new Field(
            name,
            value,
            hasAttributes ? attributes.headers : null,
            hasAttributes ? attributes.type == 'file' : false,
            hasAttributes ? attributes.filename : null
        ));
        // const hasFilename = hasAttributes && typeof attributes.filename == 'string' && attributes.filename != '';
        // const hasHeaders = hasAttributes && typeof attributes.headers == 'object';
        // const CRLF = '\r\n';
        // this.#content += `--${this.#boundary}${CRLF}`;
        // this.#content += `Content-Disposition: form-data; name="${name}"` + (hasFilename ? `; filename="${attributes.filename}"` : '');

        // if (hasHeaders) {
        //     for (let h in attributes.headers) {
        //         let v = attributes.headers[h];
        //         if (v && v != '') this.#content += `${CRLF}${h}: ${v}`;
        //     }
        // }

        // var v = value;
        // if (MultipartResponse.#isIterable(v)) {
        //     if (hasFilename) {
        //         this.#content += `${CRLF}Content-Transfer-Encoding: binary`;
        //         v = Buffer.from(v).toString('binary');
        //     }

        //     else {
        //         v = Array.from(v).join(',') || null;
        //     }
        // }
        // this.#content += `${CRLF}${CRLF}${v}`;
        // this.#content += CRLF;

        return this;
    }

    finalize() {
        this.#response.header({
            'Content-Type': `multipart/form-data; boundary=${this.#boundary}`,
        });
        for (let field of this.#fields) {
            this.#response.write(`--${this.#boundary}${CRLF}`);
            this.#response.write(field.toBuffer());
        }
        this.#response.write(`--${this.#boundary}--${CRLF}`);

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