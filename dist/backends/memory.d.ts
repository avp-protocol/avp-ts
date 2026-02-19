/**
 * In-memory backend for AVP (useful for testing).
 */
import { BackendType, Capabilities, Limits, SecretMetadata } from "../types.js";
import { BackendBase, StoreResult, RetrieveResult, ListResult } from "./base.js";
/**
 * In-memory backend for testing and development.
 *
 * WARNING: Secrets are stored in plaintext in memory.
 * Do not use in production.
 */
export declare class MemoryBackend extends BackendBase {
    private readonly _backendId;
    private readonly _secrets;
    constructor(backendId?: string);
    get backendType(): BackendType;
    get backendId(): string;
    get capabilities(): Capabilities;
    get limits(): Limits;
    getInfo(): Record<string, string>;
    store(workspace: string, name: string, value: Uint8Array, labels?: Record<string, string>, expiresAt?: Date): Promise<StoreResult>;
    retrieve(workspace: string, name: string, version?: number): Promise<RetrieveResult>;
    delete(workspace: string, name: string): Promise<boolean>;
    listSecrets(workspace: string, filterLabels?: Record<string, string>, cursor?: string, limit?: number): Promise<ListResult>;
    getMetadata(workspace: string, name: string): Promise<SecretMetadata>;
    /** Clear all secrets (for testing) */
    clear(): void;
}
//# sourceMappingURL=memory.d.ts.map