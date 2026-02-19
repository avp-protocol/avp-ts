/**
 * AVP Client - Main entry point for the protocol.
 */
import { AuthMethod, DeleteResponse, DiscoverResponse, ListResponse, RetrieveResponse, RotateResponse, Session, StoreResponse } from "./types.js";
import { BackendBase } from "./backends/base.js";
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
export declare class AVPClient {
    static readonly VERSION = "0.1.0";
    static readonly DEFAULT_TTL = 3600;
    private readonly _backend;
    private readonly _sessions;
    /**
     * Initialize the AVP client.
     *
     * @param backend - The backend to use for storing secrets
     */
    constructor(backend: BackendBase);
    /**
     * Query vault capabilities (DISCOVER operation).
     */
    discover(): DiscoverResponse;
    /**
     * Establish a session (AUTHENTICATE operation).
     */
    authenticate(options?: AuthenticateOptions): Session;
    private _validateSession;
    /**
     * Store a secret (STORE operation).
     */
    store(sessionId: string, name: string, value: Uint8Array, options?: StoreOptions): Promise<StoreResponse>;
    /**
     * Retrieve a secret (RETRIEVE operation).
     */
    retrieve(sessionId: string, name: string, version?: number): Promise<RetrieveResponse>;
    /**
     * Delete a secret (DELETE operation).
     */
    delete(sessionId: string, name: string): Promise<DeleteResponse>;
    /**
     * List secrets (LIST operation).
     */
    listSecrets(sessionId: string, options?: ListOptions): Promise<ListResponse>;
    /**
     * Rotate a secret (ROTATE operation).
     */
    rotate(sessionId: string, name: string, newValue: Uint8Array): Promise<RotateResponse>;
    /**
     * Close the client and release resources.
     */
    close(): Promise<void>;
}
//# sourceMappingURL=client.d.ts.map