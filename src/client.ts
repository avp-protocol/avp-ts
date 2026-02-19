/**
 * AVP Client - Main entry point for the protocol.
 */

import { randomBytes } from "crypto";

import {
  AuthMethod,
  ConformanceLevel,
  DeleteResponse,
  DiscoverResponse,
  ListResponse,
  RetrieveResponse,
  RotateResponse,
  Session,
  StoreResponse,
  validateSecretName,
  validateWorkspaceId,
  isSessionExpired,
} from "./types.js";
import { BackendBase } from "./backends/base.js";
import {
  AuthenticationError,
  InvalidNameError,
  InvalidWorkspaceError,
  SessionExpiredError,
  SessionNotFoundError,
  ValueTooLargeError,
} from "./errors.js";

/** Authentication options */
export interface AuthenticateOptions {
  workspace?: string;
  agentId?: string;
  authMethod?: AuthMethod;
  authData?: Record<string, string>;
  requestedTtl?: number;
}

/** Store options */
export interface StoreOptions {
  labels?: Record<string, string>;
  expiresAt?: Date;
}

/** List options */
export interface ListOptions {
  filterLabels?: Record<string, string>;
  cursor?: string;
  limit?: number;
}

/**
 * AVP Protocol Client.
 *
 * This is the main entry point for interacting with the AVP protocol.
 * It manages sessions and delegates operations to the configured backend.
 */
export class AVPClient {
  static readonly VERSION = "0.1.0";
  static readonly DEFAULT_TTL = 3600; // 1 hour

  private readonly _backend: BackendBase;
  private readonly _sessions: Map<string, Session>;

  /**
   * Initialize the AVP client.
   *
   * @param backend - The backend to use for storing secrets
   */
  constructor(backend: BackendBase) {
    this._backend = backend;
    this._sessions = new Map();
  }

  /**
   * Query vault capabilities (DISCOVER operation).
   */
  discover(): DiscoverResponse {
    return {
      version: AVPClient.VERSION,
      conformance: ConformanceLevel.FULL,
      backends: [this._backend.getDescriptor()],
      activeBackend: this._backend.backendId,
      capabilities: this._backend.capabilities,
      authMethods: [AuthMethod.NONE, AuthMethod.TOKEN],
      limits: this._backend.limits,
    };
  }

  /**
   * Establish a session (AUTHENTICATE operation).
   */
  authenticate(options: AuthenticateOptions = {}): Session {
    const {
      workspace = "default",
      agentId = "avp-ts",
      authMethod = AuthMethod.NONE,
      authData,
      requestedTtl,
    } = options;

    // Validate workspace
    if (!validateWorkspaceId(workspace)) {
      throw new InvalidWorkspaceError(`Invalid workspace: ${workspace}`);
    }

    // Handle termination
    if (authMethod === AuthMethod.TERMINATE) {
      if (authData?.session_id) {
        const sessionId = authData.session_id;
        this._sessions.delete(sessionId);
        return {
          sessionId,
          workspace,
          backend: this._backend.backendId,
          agentId,
          createdAt: new Date(),
          expiresAt: new Date(),
          ttlSeconds: 0,
        };
      }
      throw new AuthenticationError("session_id required for termination");
    }

    // For other methods, create a new session
    const ttl = Math.min(
      requestedTtl ?? AVPClient.DEFAULT_TTL,
      this._backend.limits.maxSessionTtlSeconds
    );

    const now = new Date();
    const sessionId = `avp_sess_${randomBytes(18).toString("base64url")}`;

    const session: Session = {
      sessionId,
      workspace,
      backend: this._backend.backendId,
      agentId,
      createdAt: now,
      expiresAt: new Date(now.getTime() + ttl * 1000),
      ttlSeconds: ttl,
    };

    this._sessions.set(sessionId, session);
    return session;
  }

  private _validateSession(sessionId: string): Session {
    const session = this._sessions.get(sessionId);
    if (!session) {
      throw new SessionNotFoundError(`Session not found: ${sessionId}`);
    }

    if (isSessionExpired(session)) {
      this._sessions.delete(sessionId);
      throw new SessionExpiredError("Session has expired");
    }

    return session;
  }

  /**
   * Store a secret (STORE operation).
   */
  async store(
    sessionId: string,
    name: string,
    value: Uint8Array,
    options: StoreOptions = {}
  ): Promise<StoreResponse> {
    const session = this._validateSession(sessionId);

    // Validate name
    if (!validateSecretName(name)) {
      throw new InvalidNameError(`Invalid secret name: ${name}`);
    }

    // Validate value size
    if (value.length > this._backend.limits.maxSecretValueLength) {
      throw new ValueTooLargeError(
        `Value exceeds maximum size of ${this._backend.limits.maxSecretValueLength} bytes`
      );
    }

    const result = await this._backend.store(
      session.workspace,
      name,
      value,
      options.labels,
      options.expiresAt
    );

    return {
      name,
      backend: this._backend.backendId,
      created: result.created,
      version: result.version,
    };
  }

  /**
   * Retrieve a secret (RETRIEVE operation).
   */
  async retrieve(
    sessionId: string,
    name: string,
    version?: number
  ): Promise<RetrieveResponse> {
    const session = this._validateSession(sessionId);

    const result = await this._backend.retrieve(
      session.workspace,
      name,
      version
    );

    return {
      name,
      value: result.value,
      encoding: "utf8",
      backend: this._backend.backendId,
      version: result.version,
    };
  }

  /**
   * Delete a secret (DELETE operation).
   */
  async delete(sessionId: string, name: string): Promise<DeleteResponse> {
    const session = this._validateSession(sessionId);

    const deleted = await this._backend.delete(session.workspace, name);

    return { name, deleted };
  }

  /**
   * List secrets (LIST operation).
   */
  async listSecrets(
    sessionId: string,
    options: ListOptions = {}
  ): Promise<ListResponse> {
    const session = this._validateSession(sessionId);

    const result = await this._backend.listSecrets(
      session.workspace,
      options.filterLabels,
      options.cursor,
      options.limit ?? 100
    );

    return {
      secrets: result.secrets,
      cursor: result.cursor,
      hasMore: result.cursor !== undefined,
    };
  }

  /**
   * Rotate a secret (ROTATE operation).
   */
  async rotate(
    sessionId: string,
    name: string,
    newValue: Uint8Array
  ): Promise<RotateResponse> {
    const session = this._validateSession(sessionId);

    const version = await this._backend.rotate(
      session.workspace,
      name,
      newValue
    );

    return {
      name,
      backend: this._backend.backendId,
      version,
      rotatedAt: new Date(),
    };
  }

  /**
   * Close the client and release resources.
   */
  async close(): Promise<void> {
    await this._backend.close();
    this._sessions.clear();
  }
}
