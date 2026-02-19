/**
 * AVP Protocol Types
 */

/** Backend storage types */
export enum BackendType {
  FILE = "file",
  KEYCHAIN = "keychain",
  HARDWARE = "hardware",
  REMOTE = "remote",
  MEMORY = "memory",
}

/** Authentication methods */
export enum AuthMethod {
  NONE = "none",
  PIN = "pin",
  TOKEN = "token",
  MTLS = "mtls",
  OS = "os",
  TERMINATE = "terminate",
}

/** Protocol conformance levels */
export enum ConformanceLevel {
  CORE = "core",
  FULL = "full",
  HARDWARE = "hardware",
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
  value?: Uint8Array; // Only populated on RETRIEVE
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

/** Name validation pattern */
const SECRET_NAME_PATTERN = /^[a-zA-Z][a-zA-Z0-9_.\-]{0,254}$/;

/** Workspace ID validation pattern */
const WORKSPACE_ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9_.\-/]{0,254}$/;

/** Validate a secret name according to AVP spec */
export function validateSecretName(name: string): boolean {
  if (!name || name.length > 255) return false;
  return SECRET_NAME_PATTERN.test(name);
}

/** Validate a workspace ID according to AVP spec */
export function validateWorkspaceId(workspaceId: string): boolean {
  if (!workspaceId || workspaceId.length > 255) return false;
  return WORKSPACE_ID_PATTERN.test(workspaceId);
}

/** Check if a session has expired */
export function isSessionExpired(session: Session): boolean {
  return new Date() > session.expiresAt;
}

/** Check if a session is still valid */
export function isSessionValid(session: Session): boolean {
  return !isSessionExpired(session);
}

/** Default capabilities */
export function defaultCapabilities(): Capabilities {
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
export function defaultLimits(): Limits {
  return {
    maxSecretNameLength: 255,
    maxSecretValueLength: 65536,
    maxLabelsPerSecret: 64,
    maxSecretsPerWorkspace: 1000,
    maxSessionTtlSeconds: 86400,
  };
}
