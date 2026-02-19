/**
 * AVP Protocol Types
 */
/** Backend storage types */
export var BackendType;
(function (BackendType) {
    BackendType["FILE"] = "file";
    BackendType["KEYCHAIN"] = "keychain";
    BackendType["HARDWARE"] = "hardware";
    BackendType["REMOTE"] = "remote";
    BackendType["MEMORY"] = "memory";
})(BackendType || (BackendType = {}));
/** Authentication methods */
export var AuthMethod;
(function (AuthMethod) {
    AuthMethod["NONE"] = "none";
    AuthMethod["PIN"] = "pin";
    AuthMethod["TOKEN"] = "token";
    AuthMethod["MTLS"] = "mtls";
    AuthMethod["OS"] = "os";
    AuthMethod["TERMINATE"] = "terminate";
})(AuthMethod || (AuthMethod = {}));
/** Protocol conformance levels */
export var ConformanceLevel;
(function (ConformanceLevel) {
    ConformanceLevel["CORE"] = "core";
    ConformanceLevel["FULL"] = "full";
    ConformanceLevel["HARDWARE"] = "hardware";
})(ConformanceLevel || (ConformanceLevel = {}));
/** Name validation pattern */
const SECRET_NAME_PATTERN = /^[a-zA-Z][a-zA-Z0-9_.\-]{0,254}$/;
/** Workspace ID validation pattern */
const WORKSPACE_ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9_.\-/]{0,254}$/;
/** Validate a secret name according to AVP spec */
export function validateSecretName(name) {
    if (!name || name.length > 255)
        return false;
    return SECRET_NAME_PATTERN.test(name);
}
/** Validate a workspace ID according to AVP spec */
export function validateWorkspaceId(workspaceId) {
    if (!workspaceId || workspaceId.length > 255)
        return false;
    return WORKSPACE_ID_PATTERN.test(workspaceId);
}
/** Check if a session has expired */
export function isSessionExpired(session) {
    return new Date() > session.expiresAt;
}
/** Check if a session is still valid */
export function isSessionValid(session) {
    return !isSessionExpired(session);
}
/** Default capabilities */
export function defaultCapabilities() {
    return {
        attestation: false,
        rotation: false,
        injection: false,
        audit: true,
        migration: false,
        implicitSessions: false,
        expiration: true,
        versioning: false,
    };
}
/** Default limits */
export function defaultLimits() {
    return {
        maxSecretNameLength: 255,
        maxSecretValueLength: 65536,
        maxLabelsPerSecret: 64,
        maxSecretsPerWorkspace: 1000,
        maxSessionTtlSeconds: 86400,
    };
}
//# sourceMappingURL=types.js.map