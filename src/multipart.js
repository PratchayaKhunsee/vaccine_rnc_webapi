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
    return Array.from(Buffer.from(array, 'utf-8'));
}

function getFieldType(filename, mime) {
    var match = typeof mime == 'string' ? mime.match(/([A-Za-z]|-)+\/([A-Za-z]|-)+/) : null;
    return typeof filename == 'string' && filename != '' && typeof mime == 'string' && match ? 'file' : 'non-file';
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
        if (arguments.length < 2 || typeof fieldname != 'string') throw new Error('Need a payload and a field name.');
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

        if(this.#isFile && !fieldHeaders.match(/Content-Type\s*:\s*([A-Za-z]|-)+\/([A-Za-z]|-)+/)){
            fieldHeaders = fieldHeaders + `${CRLF}Content-Type: application/octet-stream`;
        }

        let payload = this.#payload;

        if (isIterable(payload)) {
            if (this.#isFile) {
                payload = Buffer.from(payload);
            }

            else {
                payload = Array.from(payload).join(',');
            }
        }

        const intArray = [
            ...charArray2IntArray(fieldInfo),
            ...charArray2IntArray(fieldHeaders),
        ];

        intArray.push(0x0d, 0x0a, 0x0d, 0x0a);
        if (this.#isFile && payload instanceof Buffer) {
            intArray.push(...payload);
        } else {
            intArray.push(...charArray2IntArray(String(payload)));
        }

        intArray.push(0x0d, 0x0a);

        return Buffer.from(intArray);
    }
}

class MultipartField {
    /** @type {String} */
    #name;
    /** @type {String|Buffer} */
    #value;
    /** @type {String} */
    #filename;
    /** @type {String} */
    #mime;
    get type() {
        return getFieldType(this.#filename, this.#mime);
    }
    get name() {
        return this.#name;
    }
    get filename() {
        return this.#filename;
    }
    get mimeType() {
        return this.#mime;
    }
    get value() {
        return this.#value;
    }
    /** @param {String} x */
    set name(x) {
        this.#name = String(x);
    }
    /** @param {String|Buffer} v */
    set value(v) {
        this.#value = v instanceof Buffer ? v : String(v);
    }
    /** @param {String} x */
    set filename(x) {
        if (x === null || x === undefined) {
            this.#filename = null;
        } else {
            this.#filename = String(x);
        }
    }
    /** @param {String} x */
    set mimeType(x) {
        if (x === null || x === undefined) {
            this.#mime = null;
        }
        else if (typeof x == 'string' && x.match(/([A-Za-z]|-)+\/([A-Za-z]|-)+/)) {
            this.#mime = x;
        }
    }

    /**
     * 
     * @param {String} name 
     * @param {String|Buffer} value 
     * @param {String} [filename] 
     * @param {String} [mime] 
     */
    constructor(name, value, filename = null, mime = null) {
        this.#name = String(name);

        this.#filename = filename === null || filename === undefined ? null : String(filename);
        this.#mime = typeof mime == 'string' && mime.match(/([A-Za-z]|-)+\/([A-Za-z]|-)+/) ? mime : null;
        this.#value = getFieldType(filename, mime) == 'file' ? Buffer.from(value) : Buffer.from(value).toString('utf-8');
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
        /** @type {String} */
        let mime = null;
        /** @type {Number[]} */
        let content = [];

        const isHeaderReadingPhase = () => phase == 0;
        const isBodyReadingPhase = () => phase == 1;

        const createField = () => {
            fields.push(new MultipartField(fieldname, content, filename, mime));
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
                else if (isHeaderReadingPhase() &&
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
                } else if (isHeaderReadingPhase() && lineString == '') {
                    phase = 1;

                    if (fieldname == null) {
                        break;
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


class MultipartBuilder {
    #boundary;
    // #content = "";
    /** @type {Field[]} */
    #fields = [];
    constructor() {
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

    toBuffer() {
        /** @type{Buffer[]} */
        let bufferList = [];
        for (let field of this.#fields) {
            bufferList.push(...Buffer.from(`--${this.#boundary}`, 'utf-8'));
            bufferList.push(field.toBuffer());
        }

        if (bufferList.length == 0) {
            bufferList.push(...Buffer.from(Buffer.from(`--${this.#boundary}`, 'utf-8')));
        }
        bufferList.push(...Buffer.from(`--${this.#boundary}--`, 'utf-8'));

        let buffer = [];
        for (let b of bufferList) {
            buffer.push(...b, 0x0d, 0x0a);
        }

        return Buffer.from(buffer);
    }
}

/**
 * An instance for handling the "multipart/form-data" response.
 */
class ExpressMultipartResponse extends MultipartBuilder{
    /** @type {import("express").Response} */
    #response;

    /**
     * @param {import("express").Response} res 
     */
    constructor(res) {
        this.#response = res;
        super();
    }


    finalize() {
        this.#response.header({
            'Content-Type': `multipart/form-data; boundary=${this.#boundary}`,
        });


        this.#response.write(this.toBuffer());
        // for (let field of this.#fields) {
        //     this.#response.write(`--${this.#boundary}${CRLF}`);
        //     this.#response.write(field.toBuffer());
        // }

        // if (this.#fields.length == 0) this.#response.write(`--${this.#boundary}${CRLF}`);
        // this.#response.write(`--${this.#boundary}--${CRLF}`);

        return this;
    }

    end() {
        this.#response.end();
    }
}

module.exports = { ExpressMultipartResponse, MultipartReader, MultipartBuilder, };