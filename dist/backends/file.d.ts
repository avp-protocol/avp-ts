/**
 * Encrypted file backend for AVP.
 */
import { BackendType, Capabilities, Limits, SecretMetadata } from "../types.js";
import { BackendBase, StoreResult, RetrieveResult, ListResult } from "./base.js";
/**
 * Encrypted file-based backend.
 *
 * Secrets are encrypted using AES-256-GCM.
 * The encryption key is derived from a password using scrypt.
 */
export declare class FileBackend extends BackendBase {
    private readonly _path;
    private readonly _backendId;
    private readonly _key;
    private _data;
    /**
     * Initialize the file backend.
     *
     * @param path - Path to the secrets file
     * @param password - Encryption password
     * @param backendId - Unique backend identifier
     */
    constructor(path: string, password: string, backendId?: string);
    private _encrypt;
    private _decrypt;
    private _load;
    private _save;
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
    close(): Promise<void>;
}
//# sourceMappingURL=file.d.ts.map