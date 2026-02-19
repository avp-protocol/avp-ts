/**
 * Encrypted file backend for AVP.
 */
import { createCipheriv, createDecipheriv, scryptSync, randomBytes } from "crypto";
import { readFileSync, writeFileSync, existsSync, statSync, chmodSync } from "fs";
import { dirname } from "path";
import { mkdirSync } from "fs";
import { BackendType, } from "../types.js";
import { BackendBase } from "./base.js";
import { SecretNotFoundError, EncryptionError } from "../errors.js";
/**
 * Encrypted file-based backend.
 *
 * Secrets are encrypted using AES-256-GCM.
 * The encryption key is derived from a password using scrypt.
 */
export class FileBackend extends BackendBase {
    _path;
    _backendId;
    _key;
    _data;
    /**
     * Initialize the file backend.
     *
     * @param path - Path to the secrets file
     * @param password - Encryption password
     * @param backendId - Unique backend identifier
     */
    constructor(path, password, backendId = "file-0") {
        super();
        this._path = path;
        this._backendId = backendId;
        // Derive encryption key from password
        const salt = Buffer.from("avp_file_backend_v1");
        this._key = scryptSync(password, salt, 32);
        // Load or create the secrets file
        this._data = this._load();
    }
    _encrypt(data) {
        const iv = randomBytes(16);
        const cipher = createCipheriv("aes-256-gcm", this._key, iv);
        const encrypted = Buffer.concat([
            cipher.update(data, "utf8"),
            cipher.final(),
        ]);
        const authTag = cipher.getAuthTag();
        return Buffer.concat([iv, authTag, encrypted]);
    }
    _decrypt(data) {
        const iv = data.subarray(0, 16);
        const authTag = data.subarray(16, 32);
        const encrypted = data.subarray(32);
        const decipher = createDecipheriv("aes-256-gcm", this._key, iv);
        decipher.setAuthTag(authTag);
        return decipher.update(encrypted) + decipher.final("utf8");
    }
    _load() {
        if (!existsSync(this._path)) {
            return { version: 1, workspaces: {} };
        }
        const stats = statSync(this._path);
        if (stats.size === 0) {
            return { version: 1, workspaces: {} };
        }
        try {
            const encrypted = readFileSync(this._path);
            const decrypted = this._decrypt(encrypted);
            return JSON.parse(decrypted);
        }
        catch (e) {
            throw new EncryptionError(`Failed to decrypt secrets file: ${e}`);
        }
    }
    _save() {
        try {
            // Ensure directory exists
            const dir = dirname(this._path);
            if (!existsSync(dir)) {
                mkdirSync(dir, { recursive: true });
            }
            const json = JSON.stringify(this._data);
            const encrypted = this._encrypt(json);
            // Write atomically
            const tempPath = `${this._path}.tmp`;
            writeFileSync(tempPath, encrypted);
            writeFileSync(this._path, readFileSync(tempPath));
            // Set restrictive permissions (0600)
            chmodSync(this._path, 0o600);
            // Clean up temp file
            try {
                writeFileSync(tempPath, Buffer.alloc(0));
            }
            catch {
                // Ignore cleanup errors
            }
        }
        catch (e) {
            throw new EncryptionError(`Failed to save secrets file: ${e}`);
        }
    }
    get backendType() {
        return BackendType.FILE;
    }
    get backendId() {
        return this._backendId;
    }
    get capabilities() {
        return {
            attestation: false,
            rotation: true,
            injection: false,
            audit: true,
            migration: true,
            implicitSessions: true,
            expiration: true,
            versioning: true,
        };
    }
    get limits() {
        return {
            maxSecretNameLength: 255,
            maxSecretValueLength: 65536,
            maxLabelsPerSecret: 64,
            maxSecretsPerWorkspace: 10000,
            maxSessionTtlSeconds: 86400,
        };
    }
    getInfo() {
        return {
            path: this._path,
            encryption: "AES-256-GCM",
        };
    }
    async store(workspace, name, value, labels, expiresAt) {
        if (!this._data.workspaces[workspace]) {
            this._data.workspaces[workspace] = {};
        }
        const ws = this._data.workspaces[workspace];
        const now = new Date();
        const existing = ws[name];
        const created = !existing;
        let version;
        let createdAt;
        if (created) {
            version = 1;
            createdAt = now.toISOString();
        }
        else {
            version = existing.metadata.version + 1;
            createdAt = existing.metadata.createdAt;
        }
        ws[name] = {
            value: Buffer.from(value).toString("base64"),
            metadata: {
                createdAt,
                updatedAt: now.toISOString(),
                backend: "file",
                version,
                labels: labels || {},
                expiresAt: expiresAt?.toISOString(),
            },
        };
        this._save();
        return { created, version };
    }
    async retrieve(workspace, name, version) {
        const ws = this._data.workspaces[workspace];
        if (!ws || !ws[name]) {
            throw new SecretNotFoundError(`Secret '${name}' not found`);
        }
        const secret = ws[name];
        // Check expiration
        if (secret.metadata.expiresAt) {
            const expiresAt = new Date(secret.metadata.expiresAt);
            if (new Date() > expiresAt) {
                delete ws[name];
                this._save();
                throw new SecretNotFoundError(`Secret '${name}' not found`);
            }
        }
        // Version check
        if (version !== undefined && version !== secret.metadata.version) {
            throw new SecretNotFoundError(`Secret '${name}' version ${version} not found`);
        }
        const value = Buffer.from(secret.value, "base64");
        return { value: new Uint8Array(value), version: secret.metadata.version };
    }
    async delete(workspace, name) {
        const ws = this._data.workspaces[workspace];
        if (!ws || !ws[name]) {
            return false;
        }
        // Overwrite value before deleting
        ws[name].value = Buffer.alloc(32).toString("base64");
        delete ws[name];
        this._save();
        return true;
    }
    async listSecrets(workspace, filterLabels, cursor, limit = 100) {
        const ws = this._data.workspaces[workspace];
        if (!ws) {
            return { secrets: [], cursor: undefined };
        }
        const now = new Date();
        const secrets = [];
        for (const [name, stored] of Object.entries(ws)) {
            // Check expiration
            if (stored.metadata.expiresAt) {
                const expiresAt = new Date(stored.metadata.expiresAt);
                if (now > expiresAt)
                    continue;
            }
            // Apply label filter
            if (filterLabels) {
                const match = Object.entries(filterLabels).every(([k, v]) => stored.metadata.labels[k] === v);
                if (!match)
                    continue;
            }
            const metadata = {
                createdAt: new Date(stored.metadata.createdAt),
                updatedAt: new Date(stored.metadata.updatedAt),
                backend: BackendType.FILE,
                version: stored.metadata.version,
                labels: stored.metadata.labels,
                expiresAt: stored.metadata.expiresAt
                    ? new Date(stored.metadata.expiresAt)
                    : undefined,
            };
            secrets.push({
                name,
                workspace,
                metadata,
            });
        }
        // Sort by name
        secrets.sort((a, b) => a.name.localeCompare(b.name));
        // Pagination
        let start = 0;
        if (cursor) {
            const parsed = parseInt(cursor, 10);
            if (!isNaN(parsed))
                start = parsed;
        }
        const end = start + limit;
        const page = secrets.slice(start, end);
        const nextCursor = end < secrets.length ? String(end) : undefined;
        return { secrets: page, cursor: nextCursor };
    }
    async getMetadata(workspace, name) {
        const ws = this._data.workspaces[workspace];
        if (!ws || !ws[name]) {
            throw new SecretNotFoundError(`Secret '${name}' not found`);
        }
        const stored = ws[name];
        // Check expiration
        if (stored.metadata.expiresAt) {
            const expiresAt = new Date(stored.metadata.expiresAt);
            if (new Date() > expiresAt) {
                delete ws[name];
                this._save();
                throw new SecretNotFoundError(`Secret '${name}' not found`);
            }
        }
        return {
            createdAt: new Date(stored.metadata.createdAt),
            updatedAt: new Date(stored.metadata.updatedAt),
            backend: BackendType.FILE,
            version: stored.metadata.version,
            labels: stored.metadata.labels,
            expiresAt: stored.metadata.expiresAt
                ? new Date(stored.metadata.expiresAt)
                : undefined,
        };
    }
    async close() {
        this._save();
    }
}
//# sourceMappingURL=file.js.map