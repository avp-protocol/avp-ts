/**
 * AVP Protocol Error Types
 */
/** Base error for all AVP errors */
export class AVPError extends Error {
    code;
    detail;
    constructor(message, code = "AVP_ERROR", detail = {}) {
        super(message);
        this.name = "AVPError";
        this.code = code;
        this.detail = detail;
    }
    toJSON() {
        return {
            ok: false,
            error: {
                code: this.code,
                message: this.message,
                detail: this.detail,
            },
        };
    }
}
/** Authentication failed */
export class AuthenticationError extends AVPError {
    constructor(message = "Authentication failed", detail = {}) {
        super(message, "AUTHENTICATION_FAILED", detail);
        this.name = "AuthenticationError";
    }
}
/** Session-related error */
export class SessionError extends AVPError {
    constructor(message, code = "SESSION_ERROR", detail = {}) {
        super(message, code, detail);
        this.name = "SessionError";
    }
}
/** Session has expired */
export class SessionExpiredError extends SessionError {
    constructor(message = "Session has expired") {
        super(message, "SESSION_EXPIRED");
        this.name = "SessionExpiredError";
    }
}
/** Session was terminated */
export class SessionTerminatedError extends SessionError {
    constructor(message = "Session was terminated") {
        super(message, "SESSION_TERMINATED");
        this.name = "SessionTerminatedError";
    }
}
/** Session does not exist */
export class SessionNotFoundError extends SessionError {
    constructor(message = "Session not found") {
        super(message, "SESSION_NOT_FOUND");
        this.name = "SessionNotFoundError";
    }
}
/** Secret does not exist */
export class SecretNotFoundError extends AVPError {
    constructor(message = "Secret not found") {
        super(message, "SECRET_NOT_FOUND");
        this.name = "SecretNotFoundError";
    }
}
/** Invalid secret or workspace name */
export class InvalidNameError extends AVPError {
    constructor(message = "Invalid name") {
        super(message, "INVALID_NAME");
        this.name = "InvalidNameError";
    }
}
/** Invalid workspace identifier */
export class InvalidWorkspaceError extends AVPError {
    constructor(message = "Invalid workspace") {
        super(message, "INVALID_WORKSPACE");
        this.name = "InvalidWorkspaceError";
    }
}
/** Backend storage capacity exceeded */
export class CapacityExceededError extends AVPError {
    constructor(message = "Capacity exceeded", detail = {}) {
        super(message, "CAPACITY_EXCEEDED", detail);
        this.name = "CapacityExceededError";
    }
}
/** Backend operation failed */
export class BackendError extends AVPError {
    constructor(message = "Backend error", detail = {}) {
        super(message, "BACKEND_ERROR", detail);
        this.name = "BackendError";
    }
}
/** Backend is not available */
export class BackendUnavailableError extends BackendError {
    constructor(message = "Backend unavailable") {
        super(message, { code: "BACKEND_UNAVAILABLE" });
        this.name = "BackendUnavailableError";
    }
}
/** Rate limit exceeded */
export class RateLimitError extends AVPError {
    constructor(message = "Rate limit exceeded", detail = {}) {
        super(message, "RATE_LIMIT_EXCEEDED", detail);
        this.name = "RateLimitError";
    }
}
/** Secret value exceeds maximum size */
export class ValueTooLargeError extends AVPError {
    constructor(message = "Value too large") {
        super(message, "VALUE_TOO_LARGE");
        this.name = "ValueTooLargeError";
    }
}
/** Encryption or decryption failed */
export class EncryptionError extends AVPError {
    constructor(message = "Encryption error") {
        super(message, "ENCRYPTION_ERROR");
        this.name = "EncryptionError";
    }
}
/** Data integrity check failed */
export class IntegrityError extends AVPError {
    constructor(message = "Integrity error") {
        super(message, "INTEGRITY_ERROR");
        this.name = "IntegrityError";
    }
}
/** Error code to exception class mapping */
const ERROR_MAP = {
    AUTHENTICATION_FAILED: AuthenticationError,
    SESSION_ERROR: SessionError,
    SESSION_EXPIRED: SessionExpiredError,
    SESSION_TERMINATED: SessionTerminatedError,
    SESSION_NOT_FOUND: SessionNotFoundError,
    SECRET_NOT_FOUND: SecretNotFoundError,
    INVALID_NAME: InvalidNameError,
    INVALID_WORKSPACE: InvalidWorkspaceError,
    CAPACITY_EXCEEDED: CapacityExceededError,
    BACKEND_ERROR: BackendError,
    BACKEND_UNAVAILABLE: BackendUnavailableError,
    RATE_LIMIT_EXCEEDED: RateLimitError,
    VALUE_TOO_LARGE: ValueTooLargeError,
    ENCRYPTION_ERROR: EncryptionError,
    INTEGRITY_ERROR: IntegrityError,
};
/** Create an exception from an error response */
export function fromErrorResponse(response) {
    const errorData = response.error || {};
    const code = errorData.code || "AVP_ERROR";
    const message = errorData.message || "Unknown error";
    const ErrorClass = ERROR_MAP[code] || AVPError;
    return new ErrorClass(message);
}
//# sourceMappingURL=errors.js.map