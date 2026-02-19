/**
 * AVP Protocol Types
 */
/** Backend storage types */
export declare enum BackendType {
    FILE = "file",
    KEYCHAIN = "keychain",
    HARDWARE = "hardware",
    REMOTE = "remote",
    MEMORY = "memory"
}
/** Authentication methods */
export declare enum AuthMethod {
    NONE = "none",
    PIN = "pin",
    TOKEN = "token",
    MTLS = "mtls",
    OS = "os",
    TERMINATE = "terminate"
}
/** Protocol conformance levels */
export declare enum ConformanceLevel {
    CORE = "core",
    FULL = "full",
    HARDWARE = "hardware"
}
/** Secret rotation configuration */
export interface RotationPolicy {
    intervalSeconds: number;
    strategy: "generate" | "notify";
    lastRotatedAt?: Date;
}
/** Non-sensitive metadata about a secret */
export interface SecretMetadata {
    createdAt: Date;
    updatedAt: Date;
    backend: BackendType;
    version: number;
    labels: Record<string, string>;
    expiresAt?: Date;
    rotationPolicy?: RotationPolicy;
}
/** A credential stored in the vault */
export interface Secret {
    name: string;
    workspace: string;
    metadata: SecretMetadata;
    value?: Uint8Array;
}
/** A logical isolation boundary for secrets */
export interface Workspace {
    id: string;
    secretsCount: number;
}
/** An authenticated context for AVP operations */
export interface Session {
    sessionId: string;
    workspace: string;
    backend: string;
    agentId: string;
    createdAt: Date;
    expiresAt: Date;
    ttlSeconds: number;
}
/** Backend descriptor */
export interface Backend {
    type: BackendType;
    id: string;
    status: "available" | "unavailable" | "locked";
    info: Record<string, string>;
}
/** Vault capability flags */
export interface Capabilities {
    attestation: boolean;
    rotation: boolean;
    injection: boolean;
    audit: boolean;
    migration: boolean;
    implicitSessions: boolean;
    expiration: boolean;
    versioning: boolean;
}
/** Operational limits */
export interface Limits {
    maxSecretNameLength: number;
    maxSecretValueLength: number;
    maxLabelsPerSecret: number;
    maxSecretsPerWorkspace: number;
    maxSessionTtlSeconds: number;
}
/** Response from DISCOVER operation */
export interface DiscoverResponse {
    version: string;
    conformance: ConformanceLevel;
    backends: Backend[];
    activeBackend: string;
    capabilities: Capabilities;
    authMethods: AuthMethod[];
    limits: Limits;
}
/** Response from STORE operation */
export interface StoreResponse {
    name: string;
    backend: string;
    created: boolean;
    version: number;
}
/** Response from RETRIEVE operation */
export interface RetrieveResponse {
    name: string;
    value: Uint8Array;
    encoding: string;
    backend: string;
    version: number;
}
/** Response from DELETE operation */
export interface DeleteResponse {
    name: string;
    deleted: boolean;
}
/** Response from LIST operation */
export interface ListResponse {
    secrets: Secret[];
    cursor?: string;
    hasMore: boolean;
}
/** Response from ROTATE operation */
export interface RotateResponse {
    name: string;
    backend: string;
    version: number;
    rotatedAt: Date;
}
/** Validate a secret name according to AVP spec */
export declare function validateSecretName(name: string): boolean;
/** Validate a workspace ID according to AVP spec */
export declare function validateWorkspaceId(workspaceId: string): boolean;
/** Check if a session has expired */
export declare function isSessionExpired(session: Session): boolean;
/** Check if a session is still valid */
export declare function isSessionValid(session: Session): boolean;
/** Default capabilities */
export declare function defaultCapabilities(): Capabilities;
/** Default limits */
export declare function defaultLimits(): Limits;
//# sourceMappingURL=types.d.ts.map