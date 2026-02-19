/**
 * Agent Vault Protocol (AVP) - TypeScript SDK
 *
 * A secure credential management protocol for AI agents.
 */
export { BackendType, AuthMethod, ConformanceLevel, RotationPolicy, SecretMetadata, Secret, Workspace, Session, Backend, Capabilities, Limits, DiscoverResponse, StoreResponse, RetrieveResponse, DeleteResponse, ListResponse, RotateResponse, validateSecretName, validateWorkspaceId, isSessionExpired, isSessionValid, defaultCapabilities, defaultLimits, } from "./types.js";
export { AVPError, AuthenticationError, SessionError, SessionExpiredError, SessionTerminatedError, SessionNotFoundError, SecretNotFoundError, InvalidNameError, InvalidWorkspaceError, CapacityExceededError, BackendError, BackendUnavailableError, RateLimitError, ValueTooLargeError, EncryptionError, IntegrityError, fromErrorResponse, } from "./errors.js";
export { AVPClient, AuthenticateOptions, StoreOptions, ListOptions, } from "./client.js";
export { BackendBase, StoreResult, RetrieveResult, ListResult, MemoryBackend, FileBackend, } from "./backends/index.js";
export declare const VERSION = "0.1.0";
//# sourceMappingURL=index.d.ts.map