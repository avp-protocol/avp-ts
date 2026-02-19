/**
 * Agent Vault Protocol (AVP) - TypeScript SDK
 *
 * A secure credential management protocol for AI agents.
 */

// Types
export {
  BackendType,
  AuthMethod,
  ConformanceLevel,
  RotationPolicy,
  SecretMetadata,
  Secret,
  Workspace,
  Session,
  Backend,
  Capabilities,
  Limits,
  DiscoverResponse,
  StoreResponse,
  RetrieveResponse,
  DeleteResponse,
  ListResponse,
  RotateResponse,
  validateSecretName,
  validateWorkspaceId,
  isSessionExpired,
  isSessionValid,
  defaultCapabilities,
  defaultLimits,
} from "./types.js";

// Errors
export {
  AVPError,
  AuthenticationError,
  SessionError,
  SessionExpiredError,
  SessionTerminatedError,
  SessionNotFoundError,
  SecretNotFoundError,
  InvalidNameError,
  InvalidWorkspaceError,
  CapacityExceededError,
  BackendError,
  BackendUnavailableError,
  RateLimitError,
  ValueTooLargeError,
  EncryptionError,
  IntegrityError,
  fromErrorResponse,
} from "./errors.js";

// Client
export {
  AVPClient,
  AuthenticateOptions,
  StoreOptions,
  ListOptions,
} from "./client.js";

// Backends
export {
  BackendBase,
  StoreResult,
  RetrieveResult,
  ListResult,
  MemoryBackend,
  FileBackend,
} from "./backends/index.js";

export const VERSION = "0.1.0";
