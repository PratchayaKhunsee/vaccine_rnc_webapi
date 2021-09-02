const crypto = require('crypto');

/**
 * @typedef {MultipartField} MultipartField
 * @typedef {Object<string,string>} MultipartFieldHeaders
 */
/** @namespace */


const CRLF = '\r\n';
function isIterableObject(obj) {
    // checks for null and undefined
    if (obj === null || typeof obj !== 'object') {
        return false;
    }
    return typeof obj[Symbol.iterator] === 'function';
}

/**
 * 
 * @param {String[]} charArray 
 */
function charArray2IntArray(charArray) {
    if (typeof charArray !== 'string') return charArray;
    return Array.from(Buffer.from(charArray, 'utf-8'));
}

/**
 * @param {String} [contentType]
 * @param {String} [headers]
 * @returns {MultipartFieldHeaders}
 */
function createFileFieldHeaders(contentType, headers) {
    contentType = String(contentType);
    return {
        'Content-Type': contentType.match(/([A-Za-z]|-)+\/([A-Za-z]|-)+/) ? contentType : 'application/octet-stream',
        ...(typeof headers == 'object' && headers !== null ? headers : {}),
    }
}

class MultipartField {
    #value;
    #fieldname;
    #filename;
    #headers;

    /** @returns {String} */
    get name() {
        return this.#fieldname;
    }

    get value() {
        return this.#value;
    }

    /** @returns {String} */
    get filename() {
        return this.#filename;
    }

    /** @returns {String} */
    get headers() {
        return this.#headers;
    }

    /**
     * 
     * @param {String} name 
     * @param {*} value 
     * @param {String} [filename] 
     * @param {MultipartFieldHeaders} [headers] 
     */
    constructor(name, value, filename, headers) {
        this.#fieldname = String(name);
        this.#value = value;
        this.#filename = filename === null || filename === undefined ? null : String(filename);
        this.#headers = typeof headers == 'object' ? { ...headers } : null;
    }

    #isFile() {
        if (this.#headers !== null) {
            for (let n in this.#headers) {
                if (n.toLowerCase().match(/content-type/) && String(this.#headers[n]).match(/([A-Za-z]|-)+\/([A-Za-z]|-)+/)
                ) {
                    return true;
                }
            }
        }
        return false;
    }

    toBuffer() {
        let fieldInfo = `Content-Disposition: form-data; name="${this.#fieldname}"` + (this.#filename ? `; filename="${this.#filename}"` : '');
        let fieldHeaders = "";

        if (this.#headers !== null) {
            for (let e of Object.entries(this.#headers)) {
                if (e[0] != '' && e[1] != '') fieldHeaders += `${CRLF}${e[0]}: ${e[1]}`;
            }
        }

        let payload = this.#value;

        if (isIterableObject(payload) && !this.#isFile()) {
            payload = Array.from(payload).join(',');
        }

        const intArray = [
            ...charArray2IntArray(fieldInfo),
            ...charArray2IntArray(fieldHeaders),
        ];

        intArray.push(0x0d, 0x0a, 0x0d, 0x0a);

        if (this.#isFile()) {
            intArray.push(...Buffer.from(payload, 'utf-8'));
        } else {
            intArray.push(...charArray2IntArray(String(payload)));
        }

        return Buffer.from(intArray);
    }
}

class MultipartBuilder {
    #boundary;
    /** @type {MultipartBuilder[]} */
    #fields = [];
    /**
     * 
     * @param {String} boundary 
     */
    constructor(boundary) {
        this.#boundary = boundary === null || boundary === undefined ? crypto.randomUUID() : String(boundary);
    }

    get boundary() {
        return this.#boundary;
    }

    set boundary(x) {
        this.#boundary = String(x);
    }

    /**
    * 
    * @param {String} name 
    * @param {*} value
    * @param {String} [filename]
    * @param {MultipartFieldHeaders} [headers]
    */
    append(name, value, filename, headers) {
        this.#fields.push(new MultipartField(
            name,
            value,
            filename,
            headers,
        ));

        return this;
    }

    /**
     * 
     * @param {Boolean} endWithCRLF 
     * @returns {Buffer}
     */
    toBuffer(endWithCRLF) {
        /** @type {Buffer[]} */
        let bufferList = [];
        for (let field of this.#fields) {
            bufferList.push(Buffer.from(`--${this.#boundary}`, 'utf-8'));
            bufferList.push(field.toBuffer());
        }

        if (bufferList.length == 0) {
            bufferList.push(Buffer.from(Buffer.from(`--${this.#boundary}`, 'utf-8')));
        }
        bufferList.push(Buffer.from(`--${this.#boundary}--`, 'utf-8'));

        /** @type {Number[]} */
        let buffer = [];

        for(let i = 0; i < bufferList.length; i++){
            buffer.push(...bufferList[i]);
            if(i < bufferList.length - 1 || endWithCRLF === true) buffer.push(0x0d, 0x0a);
        }

        return Buffer.from(buffer);
    }
}

/**
 * An instance for handling the "multipart/form-data" response.
 */
class ExpressMultipartResponse extends MultipartBuilder {
    /** @type {import("express").Response} */
    #response;

    /**
     * @param {import("express").Response} res 
     */
    constructor(res) {
        super();
        this.#response = res;
    }


    finalize() {
        this.#response.header({
            'Content-Type': `multipart/form-data; boundary=${this.boundary}`,
        }).write(this.toBuffer());
        return this;
    }

    end() {
        this.#response.end();
    }
}


class MultipartReader {
    /** @type {MultipartField[]} */
    #fields;
    /**
     * 
     * @param {Buffer|String} buffer
     */
    constructor(buffer) {
        let bytes = typeof buffer == 'string' || buffer instanceof String ? Buffer.from(buffer) : buffer;
        /** @type {MultipartField[]} */
        let fields = [];
        /** @type {String} */
        let boundary = null;
        let phase = 0;
        /** @type {Number[]} */
        let currentLine = [];
        let isFirstLine = true;
        /** @type {String} */
        let filename = null;
        /** @type {String} */
        let fieldname = null;
        /** @type {MultipartFieldHeaders} */
        let headers = {};
        /** @type {Number[]} */
        let content = [];

        const isHeaderReadingPhase = () => phase == 0;
        const isBodyReadingPhase = () => phase == 1;

        const createField = () => {
            fields.push(new MultipartField(fieldname, Buffer.from(content), filename, headers));
        };

        for (let i = 0; i < bytes.length; i++) {
            if ((bytes[i] == 0x0d && bytes[i + 1] == 0x0a) || i == bytes.length - 1) {
                let lineString = Buffer.from(currentLine).toString();

                if (isFirstLine) {
                    if (lineString.length > 2 && lineString[0] == '-' && lineString[1] == '-') {
                        boundary = lineString.substring(2);
                    } else {
                        break;
                    }
                }
                else if (lineString == `--${boundary}`) {
                    createField();
                    phase = 0;
                    filename = fieldname = mime = null;
                    content = [];
                }
                else if (lineString == `--${boundary}--`) {
                    createField();
                    break;
                }
                else if (isBodyReadingPhase()) {
                    if (content.length != 0) {
                        content.push(0x0d, 0x0a);
                    }
                    content.push(...currentLine);
                }
                else if (isHeaderReadingPhase()) {
                    if (lineString.match(/Content-Disposition\s*:\s*form-data.+?name\s*=\s*\".*\"/)) {
                        let n = lineString.split(/Content-Disposition\s*:.+?name\s*=\s*\"/);

                        let fn = lineString.split(/Content-Disposition\s*:.+?filename\s*=\s*\"/);

                        if (n.length < 2) throw 0;

                        fieldname = n[1].replace(/\"*$/, "");

                        filename = fn.length < 2 ? null : fn[1].replace(/\"*$/, "");
                    }

                    else if (lineString.match(/([A-Za-z]|-)+\s*:.+/)) {
                        let m = lineString.split(/([A-Za-z]|-)+\s*:\s*"/);
                        if (m.length > 1) {
                            headers[m[0]] = m[1];
                        }
                    }
                    else if (lineString == '') {
                        phase = 1;
                        if (fieldname == null) {
                            break;
                        }
                    }
                }
                i++;
                currentLine = [];
                isFirstLine = false;
            } else {
                currentLine.push(bytes[i]);
            }


        }

        this.#fields = fields;
    }

    /**
     * 
     * @param {String} name 
     * @returns {MultipartField[]}
     */
    get(name) {
        let list = name === undefined ? Array.from(this.#fields) : this.#fields.filter(x => x.name == String(name));
        return list;
    }
}

module.exports = {
    ExpressMultipartResponse,
    MultipartReader,
    MultipartBuilder,
    createFileFieldHeaders,
};