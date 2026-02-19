/**
 * AVP Protocol Error Types
 */
/** Base error for all AVP errors */
export declare class AVPError extends Error {
    readonly code: string;
    readonly detail: Record<string, unknown>;
    constructor(message: string, code?: string, detail?: Record<string, unknown>);
    toJSON(): Record<string, unknown>;
}
/** Authentication failed */
export declare class AuthenticationError extends AVPError {
    constructor(message?: string, detail?: Record<string, unknown>);
}
/** Session-related error */
export declare class SessionError extends AVPError {
    constructor(message: string, code?: string, detail?: Record<string, unknown>);
}
/** Session has expired */
export declare class SessionExpiredError extends SessionError {
    constructor(message?: string);
}
/** Session was terminated */
export declare class SessionTerminatedError extends SessionError {
    constructor(message?: string);
}
/** Session does not exist */
export declare class SessionNotFoundError extends SessionError {
    constructor(message?: string);
}
/** Secret does not exist */
export declare class SecretNotFoundError extends AVPError {
    constructor(message?: string);
}
/** Invalid secret or workspace name */
export declare class InvalidNameError extends AVPError {
    constructor(message?: string);
}
/** Invalid workspace identifier */
export declare class InvalidWorkspaceError extends AVPError {
    constructor(message?: string);
}
/** Backend storage capacity exceeded */
export declare class CapacityExceededError extends AVPError {
    constructor(message?: string, detail?: Record<string, unknown>);
}
/** Backend operation failed */
export declare class BackendError extends AVPError {
    constructor(message?: string, detail?: Record<string, unknown>);
}
/** Backend is not available */
export declare class BackendUnavailableError extends BackendError {
    constructor(message?: string);
}
/** Rate limit exceeded */
export declare class RateLimitError extends AVPError {
    constructor(message?: string, detail?: Record<string, unknown>);
}
/** Secret value exceeds maximum size */
export declare class ValueTooLargeError extends AVPError {
    constructor(message?: string);
}
/** Encryption or decryption failed */
export declare class EncryptionError extends AVPError {
    constructor(message?: string);
}
/** Data integrity check failed */
export declare class IntegrityError extends AVPError {
    constructor(message?: string);
}
/** Create an exception from an error response */
export declare function fromErrorResponse(response: Record<string, unknown>): AVPError;
//# sourceMappingURL=errors.d.ts.map