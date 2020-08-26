/**
 * @typedef {UserNotFoundError|EmptyInputError|Error|String} LoginErrorCause
 * @typedef {InvalidIdNumberError|UserNameExistError|IdentityExistError|EmptyInputError|Error|String} LoginErrorCause
 */
class UserNotFoundError extends Error{
    /**
     * @param {String} username 
     */
    constructor(username){
        super(`User "${username}" not found.`);
    }
}

class EmptyInputError extends Error {
    constructor(){
        super('Empty input was found.');
    }
}

class InvalidIdNumberError extends Error{
    /**
     * @param {String[13]} idNumber 
     */
    constructor(idNumber){
        super(`Id number "${idNumber}" is invalid.`)
    }
}

class UserNameExistError extends Error{
    /**
     * @param {String} username 
     */
    constructor(username){
        super(`Username "${username}" is already used.`);
    }
}

class IdentityExistError extends Error{
    /**
     * @param {String[13]} idNumber 
     */
    constructor(idNumber){
        super(`A person who used ${idNumber} is existed.`);
    }
}

class LoginError extends Error{
    /** @type {LoginErrorCause} */
    cause = null;
    /**
     * @param {LoginErrorCause} err
     */
    constructor(err){
        super(err instanceof Error ? err.message : err);
        this.cause = err;
    }
}

class SigninError extends Error{
    /** @type {LoginErrorCause} */
    cause = null;
    /**
     * @param {LoginErrorCause} err
     */
    constructor(err){
        super(err instanceof Error ? err.message : err);
        this.cause = err;
    }
}


module.exports = {
    UserNameExistError,
    IdentityExistError,
    InvalidIdNumberError,
    EmptyInputError,
    UserNotFoundError,
    LoginError,
    SigninError
};