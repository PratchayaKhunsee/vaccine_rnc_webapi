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

class PatientNotFoundError extends Error {
    /**
     * 
     * @param {Number} vaccinePatientID 
     */
    constructor(vaccinePatientID) {
        super(`Patient #${vaccinePatientID} not found`);
    }
}

class EditPatientProfileError extends Error {
    /**
     * 
     * @param {Number} vaccinePatientID 
     */
    constructor(vaccinePatientID) {
        super(`Patient #${vaccinePatientID} cannot be modified`);
    }
}

class CreatePatientError extends Error {
    /**
     * 
     * @param {Number} personID 
     */
    constructor(personID) {
        super(`Patient creation for person #${personID} cannot be completed`);
    }
}

class UpdatePatientIDForPersonError extends Error {
    constructor(personID) {
        super(`Updating patient id for person #${personID} cannot be completed`);
    }
}

class VaccineRecordNotFoundError extends Error {
    /**
     * 
     * @param {Number} vaccinePatientID 
     */
    constructor(vaccinePatientID) {
        super(`No vaccination record for person #${vaccinePatientID}`);
    }
}

class CreateEmptyRecordError extends Error {
    constructor() {
        super(`Cannot create empty record`);
    }
}

class UpdateRecordIDForPatientError extends Error{
    /**
     * 
     * @param {Number} vaccinePatientID 
     */
    constructor(vaccinePatientID){
        super(`Updating record id for patient #${vaccinePatientID} was not completed`);
    }
}

class CreateVaccineError extends Error{
    constructor(){
        super(`Vaccine list cannot be added`);
    }
}

class UpdateVaccinationError extends Error{
    constructor(){
        super(`Updating vaccination was not completed`);
    }
}

class CreateVaccinationProgramError extends Error{
    /**
     * 
     * @param {Number} vaccinePatientID 
     */
    constructor(vaccinePatientID){
        super(`Creating vaccination program for record #${vaccinePatientID} was not completed`);
    }
}

class CreateParentingError extends Error{
    /**
     * 
     * @param {Number} personID 
     * @param {Number} vaccinePatientID 
     */
    constructor(personID, vaccinePatientID){
        super(`Creating parenting between person #${personID} and patient #${vaccinePatientID} was not completed`);
    }
}

class ParentingNotFoundError extends Error{
    /**
     * 
     * @param {Number} personID 
     */
    constructor(personID){
        super(`Parenting for person #${personID} not found`);
    }
}

class RemoveParentingError extends Error{
    constructor(){
        super(`Removing parenting was not completed`);
    }
}

class CertificateNotFoundError extends Error{
    /**
     * 
     * @param {Number} personID 
     */
    constructor(personID){
        super(`Certifications of person #${personID} not found`);
    }
}

class CreateCertificationError extends Error{
    /**
     * 
     * @param {Number} personID 
     */
    constructor(personID){
        super(`Creating certification for person #${personID} was not completed`);
    }
}

class UpdateCertificationError extends Error{
    /**
     * 
     * @param {Number} certID 
     */
    constructor(certID){
        super(`Updating certification #${certID} was not completed`);
    }
}

// <=========================================================================> //

class ErrorWithCause extends Error {
    /** @type {Error|String} */
    cause = null;
    /**
     * @param {Error|String} err
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

class ParentingError extends ErrorWithCause {
    /**
     * @param {LoginErrorCause} err
     */
    constructor(err) {
        super(err);
    }
}

class PatientError extends ErrorWithCause {
    /**
     * @param {LoginErrorCause} err
     */
    constructor(err) {
        super(err);
    }
}

module.exports = {
    UserNameExistError,
    IdentityExistError,
    InvalidIdNumberError,
    EmptyInputError,
    UserNotFoundError,
    PatientNotFoundError,
    EditPatientProfileError,
    CreatePatientError,
    UpdatePatientIDForPersonError,
    VaccineRecordNotFoundError,
    CreateEmptyRecordError,
    UpdateRecordIDForPatientError,
    CreateVaccineError,
    UpdateVaccinationError,
    CreateVaccinationProgramError,
    CreateParentingError,
    ParentingNotFoundError,
    RemoveParentingError,
    CertificateNotFoundError,
    CreateCertificationError,
    UpdateCertificationError,
    // ===================== //
    LoginError,
    SigninError,
    CertificateError,
    RecordError,
    ParentingError,
    PatientError
};