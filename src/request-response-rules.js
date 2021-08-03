const DateString = String;
/**
 * @typedef {'login'|'signup'|'user/view'|'user/edit/info'|'user/edit/account'|'record/view'|'record/create'|'record/edit'|'patient/view'|'patient/create'|'patient/create/self'|'patient/edit'|'certificate/view'|'certificate/view/header'|'certificate/available'|'certificate/create'|'certificate/list'|'certificate/list/details'|'certificate/edit'|'certificate/edit/header'} RoutingPathNameList
 */
/** @namespace Ocean */
/**
 * The reference of response code inside of header when the process
 * got caught when an error occurs.
 */
const responseErrorCodeList = {
    'login': {
        USER_NOT_FOUND: 9000,
        PASSWORD_INCORRECT: 9001,
    },
    'signup': {
        USERNAME_EXIST: 9003,
    },
    'user/view': {
        // Response with an empty object
    },
    'user/edit/info': {
        USER_INFO_MODIFYING_FAILED: 1001,
    },
    'user/edit/account': {
        USER_PASSWORD_CHANGING_FAILED: 1002,
    },
    'record/view': {
        // Response with an empty object
    },
    'record/create': {
        RECORD_CREATING_FAILED: 2001,
    },
    'record/edit': {
        RECORD_MODIFYING_FAILED: 2002,
    },
    'patient/view': {
        // Response with an empty list
    },
    'patient/create': {
        PATIENT_CREATING_FAILED: 3001,
    },
    'patient/create/self': {
        PATIENT_SELF_CREATING_FAILED: 3002,
    },
    'patient/edit': {
        PATIENT_MODIYING_FAILED: 3003,
    },
    'certificate/view': {
        // Response with an empty object
    },
    'certificate/view/header': {
        // Response with an empty object
    },
    'certificate/available': {
        // Response with an empty list
    },
    'certificate/create': {
        CERTIFICATE_CREATING_FAILED: 4001,
    },
    'certificate/list': {
        // Response with an empty list
    },
    'certificate/list/details': {
        // Response with an empty list
    },
    'certificate/edit': {
        CERTIFICATE_MODIFYING_FAILED: 4002,
    },
    'certificate/edit/header': {
        CERTIFICATE_HEADER_MODIFYING_FAILED: 4003,
    },
};

/**
 * The http code that the system used.
 */
const usedHttpCodeList = {
    OK: 200,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
};

/**
 * The parameter of request that it should be required
 */
const requestRequiredParameters = {
    'login': {
        username: String,
        password: String,
    },
    'signup': {
        firstname: String,
        lastname: String,
        name_prefix: Number,
        gender: Number,
        username: String,
        password: String,
    },
    'user/view': {
        // Use authentication header to identify user
    },
    'user/edit/info': {
        // Use authentication header to identify user
        firstname: String,
        lastname: String,
        name_prefix: Number,
        gender: Number,
    },
    'user/edit/account': {
        // Use authentication header to identify user
        old_password: String,
        new_password: String,
    },
    'record/view': {
        patient_id: Number,
    },
    'record/create': {
        patient_id: Number,
    },
    'record/edit': {
        id: Number,
        bcg_first: DateString,
        hb_first: DateString,
        hb_second: DateString,
        opv_early_first: DateString,
        opv_early_second: DateString,
        opv_early_third: DateString,
        dtp_hb_first: DateString,
        dtp_hb_second: DateString,
        dtp_hb_third: DateString,
        ipv_first: DateString,
        mmr_first: DateString,
        mmr_second: DateString,
        je_first: DateString,
        je_second: DateString,
        opv_later_first: DateString,
        opv_later_second: DateString,
        dtp_first: DateString,
        dtp_second: DateString,
        hpv_first: DateString,
        dt_first: DateString,
    },
    'patient/view': {
        // Use authentication header to identify user
    },
    'patient/create': {
        // Use authentication header to identify user
        firstname: String,
        lastname: String,
    },
    'patient/create/self': {
        // Use authentication header to identify user
        firstname: String,
        lastname: String,
    },
    'patient/edit': {
        // Use authentication header to identify user
        firstname: String,
        lastname: String,
        patient_id: Number,
    },
    'certificate/view': {
        patient_id: Number,
    },
    'certificate/view/header': {
        patient_id: Number,
    },
    'certificate/available': {
        patient_id: Number,
    },
    'certificate/create': {
        patient_id: Number,
        vaccine_name: String,
        dose: Number,
    },
    'certificate/list': {
        patient_id: Number,
    },
    'certificate/list/details': {
        patient_id: Number,
    },
    'certificate/edit': {
        certifacate_id: Number,
        vaccine_name: String,
        certify_from: DateString,
        certify_to: DateString,
        clinician_signature: Uint8Array,
        administering_centre: Uint8Array,
        vaccine_manufacturer: String,
        vaccine_batch_no: String,
    },
    'certificate/edit/header': {
        patient_id: String,
        firstname: String,
        lastname: String,
        date_of_birth: DateString,
        sex: String,
        nationality: String,
        vaccinate_against: String,
    },
    isSameType(value, type) {
        if (value instanceof type) return true;
        if (type === String && typeof value == 'string') return true;
        if (type === Number && typeof value == 'number') return true;
        return false;
    },
    /**
     * Return [true] if the requested parameters are all valid.
     * @param {RoutingPathNameList} routes 
     * @param {Object<string, *>} params 
     */
    check(routes, params) {
        if (!(routes in requestRequiredParameters) || routes == 'check') return false;
        for (let n in params) {
            // Reject when finding another parameter that is not in the list
            if (!(n in requestRequiredParameters[routes])) return false;
            let val = params[n];
            // Reject when the type of value is not same as the type in the list.
            if (!requestRequiredParameters.isSameType(val, requestRequiredParameters[routes][n])) return false;
        }

        return true;
    }
};

/**
 * The rules of client-server communication.
 */
const RequestResponseRules = {
    httpCode: usedHttpCodeList,
    requestParameters: requestRequiredParameters,
    errorResponseCode: responseErrorCodeList,
};

module.exports = RequestResponseRules;
