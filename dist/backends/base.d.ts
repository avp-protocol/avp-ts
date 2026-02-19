/**
 * Base backend interface for AVP.
 */
import { Backend, BackendType, Capabilities, Limits, Secret, SecretMetadata } from "../types.js";
/** Store operation result */
export interface StoreResult {
    created: boolean;
    version: number;
}
/** Retrieve operation result */
export interface RetrieveResult {
    value: Uint8Array;
    version: number;
}
/** List operation result */
export interface ListResult {
    secrets: Secret[];
    cursor?: string;
}
/** Abstract base class for AVP backends */
export declare abstract class BackendBase {
    /** Return the backend type */
    abstract get backendType(): BackendType;
    /** Return a unique backend identifier */
    abstract get backendId(): string;
    /** Return backend capabilities */
    get capabilities(): Capabilities;
    /** Return backend limits */
    get limits(): Limits;
    /** Get the backend descriptor */
    getDescriptor(): Backend;
    /** Get backend-specific information */
    getInfo(): Record<string, string>;
    /**
     * Store a secret.
     *
     * @param workspace - Workspace identifier
     * @param name - Secret name
     * @param value - Secret value (bytes)
     * @param labels - Optional key-value labels
     * @param expiresAt - Optional expiration timestamp
     * @returns Tuple of (created, version) where created is true if new secret
     */
    abstract store(workspace: string, name: string, value: Uint8Array, labels?: Record<string, string>, expiresAt?: Date): Promise<StoreResult>;
    /**
     * Retrieve a secret value.
     *
     * @param workspace - Workspace identifier
     * @param name - Secret name
     * @param version - Optional specific version
     * @returns Tuple of (value, version)
     * @throws SecretNotFoundError if secret doesn't exist
     */
    abstract retrieve(workspace: string, name: string, version?: number): Promise<RetrieveResult>;
    /**
     * Delete a secret.
     *
     * @param workspace - Workspace identifier
     * @param name - Secret name
     * @returns True if secret existed and was deleted, false otherwise
     */
    abstract delete(workspace: string, name: string): Promise<boolean>;
    /**
     * List secrets in a workspace.
     *
     * @param workspace - Workspace identifier
     * @param filterLabels - Optional label filter
     * @param cursor - Pagination cursor
     * @param limit - Maximum number of results
     * @returns Tuple of (secrets, nextCursor)
     */
    abstract listSecrets(workspace: string, filterLabels?: Record<string, string>, cursor?: string, limit?: number): Promise<ListResult>;
    /**
     * Get secret metadata without the value.
     *
     * @param workspace - Workspace identifier
     * @param name - Secret name
     * @returns Secret metadata
     * @throws SecretNotFoundError if secret doesn't exist
     */
    abstract getMetadata(workspace: string, name: string): Promise<SecretMetadata>;
    /**
     * Rotate a secret value.
     *
     * @param workspace - Workspace identifier
     * @param name - Secret name
     * @param newValue - New secret value
     * @returns New version number
     * @throws SecretNotFoundError if secret doesn't exist
     */
    rotate(workspace: string, name: string, newValue: Uint8Array): Promise<number>;
    /** Close the backend and release resources */
    close(): Promise<void>;
}
//# sourceMappingURL=base.d.ts.map