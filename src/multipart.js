const crypto = require('crypto');

/**
 * @typedef {Object} FieldAttributes
 * @property {String} [filename]
 * @property {'non-file'|'file'} [type='non-file']
 * @property {Object<string,string>} [headers]
 */
/**
 * @typedef {MultipartField} MultipartField
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
    return Array.from(array).map(x => x.charCodeAt());
}

function getType(filename, mime) {
    var match = typeof mime == 'string' ? mime.match(/([A-Za-z]|-)+/) : null;
    return typeof filename == 'string' && filename != '' && typeof mime == 'string' && match !== null && match.length == 2 ? 'file' : 'non-file';
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

            intArray.push(...payload);

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
class ExpressMultipartResponse {
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
    append(name, value, attributes) {
        const hasAttributes = typeof attributes == 'object';
        this.#fields.push(new Field(
            name,
            value,
            hasAttributes ? attributes.headers : null,
            hasAttributes ? attributes.type == 'file' : false,
            hasAttributes ? attributes.filename : null
        ));

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

        if (this.#fields.length == 0) this.#response.write(`--${this.#boundary}${CRLF}`);
        this.#response.write(`--${this.#boundary}--${CRLF}`);

        return this;
    }

    end() {
        this.#response.end();
    }
}


class MultipartField {
    name;
    /** @type {String|Buffer} */
    #value;
    filename;
    mime;
    get type() {
        return getType(this.filename, mime);
    }

    get value() {
        return this.#value;
    }
    set value(v) {
        this.#value = v instanceof Buffer ? v : String(v);
    }

    /**
     * 
     * @param {String} name 
     * @param {String|Buffer} value 
     * @param {String} [filename] 
     * @param {String} [mime] 
     */
    constructor(name, value, filename = null, mime = null) {
        this.name = String(name);

        this.filename = String(filename);
        this.mime = String(mime);
        value = value instanceof Buffer ? value : String(value);
        this.#value = getType(String(filename), String(mime)) == 'file' ? Buffer.from(value) : value;
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
        let fields = [];
        let boundary = null;
        let phase = 0;
        let currentLine = [];
        let isFirstLine = true;
        let filename = null;
        let fieldname = null;
        let mime = null;
        let content = [];

        const isHeaderReadingPhase = () => phase == 0;
        const isBodyReadingPhase = () => phase == 1;

        const createField = () => {
            fields.push(new MultipartField(fieldname, content, filename, mime));
        };


        for (let i = 0; i < bytes.length; i++) {
            if (bytes[i] == 0x0d && bytes[i + 1] == 0x0a) {
                let lineString = Buffer.from(currentLine).toString('utf8');

                if (isFirstLine) {
                    if (lineString.length > 2 && lineString[0] == lineString[1] == '-') {
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
                else if (phase == 0 &&
                    lineString.match(/Content-Disposition\s*:\s*form-data.+?name\s*=\s*\".*\"/)
                ) {
                    let n = lineString.split(/Content-Disposition\s*:.+?name\s*=\s*\"/);

                    let fn = lineString.split(/Content-Disposition\s*:.+?filename\s*=\s*\"/);

                    if (n.length < 2) throw 0;

                    fieldname = n[1].replace(/\"*$/, "");

                    filename = fn.length < 2 ? null : fn[1].replace(/\"*$/, "");
                }
                else if (isHeaderReadingPhase() &&
                    lineString.match(/Content-Type\s*:.+/)) {
                    let m = lineString.split(/Content-Type\s*:\s*"/);
                    if (m.length > 1) {
                        let h = m[1].split(/\//);

                        if (m.length < 2) continue;
                        let front = h[0];
                        let back = h[1];
                        for (let i = 0; i < back.length; i++) {
                            if (back[i].match(/([A-Za-z]|-)/)) {
                                back = back.substring(0, i + 1);
                                continue;
                            }
                        }

                        mime = `${front}/${back}`;
                    }
                } else if (isHeaderReadingPhase() && lineString != '') {
                    phase = 1;

                    if (fieldname == null) {
                        break;
                    }

                }
                i++;
                currentLine = [];
            } else {
                currentLine.push(bytes[i]);
            }

            this.#fields = fields;
        }
    }

    /**
     * 
     * @param {String} name 
     * @returns {MultipartField|MultipartField[]}
     */
    get(name) {
        let list = name === undefined ? Array.from(this.#fields) : this.#fields.filter(x => x.name == String(name));
        return list.length == 0 ? null : (list.length == 1 ? list[0] : list);
    }
}

module.exports = { ExpressMultipartResponse, MultipartReader, };