/**
 * @typedef {UserNotFoundError|EmptyInputError|Error|String} LoginErrorCause
 * @typedef {InvalidIdNumberError|UserNameExistError|IdentityExistError|EmptyInputError|Error|String} LoginErrorCause
 */
class UserNotFoundError extends Error {
    /**
     * @param {String} username 
     */
    constructor(username) {
        super(`User "${username}" not found.`);
    }
}

class EmptyInputError extends Error {
    constructor() {
        super('Empty input was found.');
    }
}

class InvalidIdNumberError extends Error {
    /**
     * @param {String[13]} idNumber 
     */
    constructor(idNumber) {
        super(`Id number "${idNumber}" is invalid.`)
    }
}

class UserNameExistError extends Error {
    /**
     * @param {String} username 
     */
    constructor(username) {
        super(`Username "${username}" is already used.`);
    }
}

class IdentityExistError extends Error {
    /**
     * @param {String[13]} idNumber 
     */
    constructor(idNumber) {
        super(`A person who used ${idNumber} is existed.`);
    }
}

class ErrorWithCause extends Error {
    /** @type {LoginErrorCause} */
    cause = null;
    /**
     * @param {LoginErrorCause} err
     */
    constructor(err) {
        super(err instanceof Error ? err.message : err);
        this.cause = err;
    }
}

class LoginError extends ErrorWithCause {
    /**
     * @param {LoginErrorCause} err
     */
    constructor(err) {
        super(err);
    }
}

class SigninError extends ErrorWithCause {
    /**
     * @param {LoginErrorCause} err
     */
    constructor(err) {
        super(err);
    }
}

class CertificateError extends ErrorWithCause {
    /**
     * @param {LoginErrorCause} err
     */
    constructor(err) {
        super(err);
    }
}

class RecordError extends ErrorWithCause {
    /**
     * @param {LoginErrorCause} err
     */
    constructor(err) {
        super(err);
    }
}

class ParentingError extends ErrorWithCause{
    /**
     * @param {LoginErrorCause} err
     */
    constructor(err){
        super(err);
    }
}

module.exports = {
    UserNameExistError,
    IdentityExistError,
    InvalidIdNumberError,
    EmptyInputError,
    UserNotFoundError,
    LoginError,
    SigninError,
    CertificateError,
    RecordError,
    ParentingError
};