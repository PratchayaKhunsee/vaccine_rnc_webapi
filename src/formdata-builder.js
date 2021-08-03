const crypto = require('crypto');

/**
 * 
 */
class FormDataBuilder {
    /** @type {import("express").Response} */
    #response;
    #boundary;
    #content = "";

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
        console.log(crypto);
        this.#response = res;
        this.#boundary = '==================================================';
    }

    /**
     * 
     * @param {String} name 
     * @param {*} value 
     */
    append(name, value, {
        filename = "",
        fields = {},
    }) {
        const CRLF = '\r\n';
        this.#content += `--${boundary}${CRLF}`;
        this.#content += `Content-Disposition: form-data; name="${name}"`, filename ? `; filename="${filename}"` : '';
        for (let a in fields) {
            let v = fields[a];
            if (v && v != '') this.#content += `${CRLF}${h}: ${v}`;
        }

        var v = value;
        if (FormDataBuilder.#isIterable(v)) {
            if (filename && filename != '') {
                v = Array.from(v).map(x => String.fromCharCode(x)).join('');
            }

            else {
                v = Array.from(v).join(',');
            }
        }
        this.#content += `${CRLF}${CRLF}${v}`;
        this.#content += CRLF;

        return this;
    }

    finalize() {
        const CRLF = FormDataBuilder.#CRLF;
        this.#content += `--${this.#boundary}--${CRLF}`;
        this.#response.header({
            'Content-Type': `multipart/form-data; boundary=${this.#boundary}`,
            'Content-Length': this.#content.length,
        });
        this.#response.write(this.#content);

        return this;
    }

    end() {
        this.#response.end();
    }
}

module.exports = FormDataBuilder;