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

module.exports = {
    UserNameExistError,
    IdentityExistError,
    InvalidIdNumberError,
    EmptyInputError,
    UserNotFoundError
};