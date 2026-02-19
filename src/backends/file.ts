/**
 * Encrypted file backend for AVP.
 */

import { createCipheriv, createDecipheriv, scryptSync, randomBytes } from "crypto";
import { readFileSync, writeFileSync, existsSync, statSync, chmodSync } from "fs";
import { join, dirname } from "path";
import { mkdirSync } from "fs";

import {
  BackendType,
  Capabilities,
  Limits,
  Secret,
  SecretMetadata,
} from "../types.js";
import { BackendBase, StoreResult, RetrieveResult, ListResult } from "./base.js";
import { SecretNotFoundError, EncryptionError } from "../errors.js";

interface StoredData {
  version: number;
  workspaces: Record<string, Record<string, StoredSecret>>;
}

interface StoredSecret {
  value: string; // base64
  metadata: {
    createdAt: string;
    updatedAt: string;
    backend: string;
    version: number;
    labels: Record<string, string>;
    expiresAt?: string;
  };
}

/**
 * Encrypted file-based backend.
 *
 * Secrets are encrypted using AES-256-GCM.
 * The encryption key is derived from a password using scrypt.
 */
export class FileBackend extends BackendBase {
  private readonly _path: string;
  private readonly _backendId: string;
  private readonly _key: Buffer;
  private _data: StoredData;

  /**
   * Initialize the file backend.
   *
   * @param path - Path to the secrets file
   * @param password - Encryption password
   * @param backendId - Unique backend identifier
   */
  constructor(path: string, password: string, backendId: string = "file-0") {
    super();
    this._path = path;
    this._backendId = backendId;

    // Derive encryption key from password
    const salt = Buffer.from("avp_file_backend_v1");
    this._key = scryptSync(password, salt, 32);

    // Load or create the secrets file
    this._data = this._load();
  }

  private _encrypt(data: string): Buffer {
    const iv = randomBytes(16);
    const cipher = createCipheriv("aes-256-gcm", this._key, iv);
    const encrypted = Buffer.concat([
      cipher.update(data, "utf8"),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();
    return Buffer.concat([iv, authTag, encrypted]);
  }

  private _decrypt(data: Buffer): string {
    const iv = data.subarray(0, 16);
    const authTag = data.subarray(16, 32);
    const encrypted = data.subarray(32);
    const decipher = createDecipheriv("aes-256-gcm", this._key, iv);
    decipher.setAuthTag(authTag);
    return decipher.update(encrypted) + decipher.final("utf8");
  }

  private _load(): StoredData {
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
    } catch (e) {
      throw new EncryptionError(`Failed to decrypt secrets file: ${e}`);
    }
  }

  private _save(): void {
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
      } catch {
        // Ignore cleanup errors
      }
    } catch (e) {
      throw new EncryptionError(`Failed to save secrets file: ${e}`);
    }
  }

  get backendType(): BackendType {
    return BackendType.FILE;
  }

  get backendId(): string {
    return this._backendId;
  }

  get capabilities(): Capabilities {
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

  get limits(): Limits {
    return {
      maxSecretNameLength: 255,
      maxSecretValueLength: 65536,
      maxLabelsPerSecret: 64,
      maxSecretsPerWorkspace: 10000,
      maxSessionTtlSeconds: 86400,
    };
  }

  getInfo(): Record<string, string> {
    return {
      path: this._path,
      encryption: "AES-256-GCM",
    };
  }

  async store(
    workspace: string,
    name: string,
    value: Uint8Array,
    labels?: Record<string, string>,
    expiresAt?: Date
  ): Promise<StoreResult> {
    if (!this._data.workspaces[workspace]) {
      this._data.workspaces[workspace] = {};
    }

    const ws = this._data.workspaces[workspace];
    const now = new Date();
    const existing = ws[name];
    const created = !existing;

    let version: number;
    let createdAt: string;

    if (created) {
      version = 1;
      createdAt = now.toISOString();
    } else {
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

  async retrieve(
    workspace: string,
    name: string,
    version?: number
  ): Promise<RetrieveResult> {
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

  async delete(workspace: string, name: string): Promise<boolean> {
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

  async listSecrets(
    workspace: string,
    filterLabels?: Record<string, string>,
    cursor?: string,
    limit: number = 100
  ): Promise<ListResult> {
    const ws = this._data.workspaces[workspace];
    if (!ws) {
      return { secrets: [], cursor: undefined };
    }

    const now = new Date();
    const secrets: Secret[] = [];

    for (const [name, stored] of Object.entries(ws)) {
      // Check expiration
      if (stored.metadata.expiresAt) {
        const expiresAt = new Date(stored.metadata.expiresAt);
        if (now > expiresAt) continue;
      }

      // Apply label filter
      if (filterLabels) {
        const match = Object.entries(filterLabels).every(
          ([k, v]) => stored.metadata.labels[k] === v
        );
        if (!match) continue;
      }

      const metadata: SecretMetadata = {
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
      if (!isNaN(parsed)) start = parsed;
    }

    const end = start + limit;
    const page = secrets.slice(start, end);
    const nextCursor = end < secrets.length ? String(end) : undefined;

    return { secrets: page, cursor: nextCursor };
  }

  async getMetadata(workspace: string, name: string): Promise<SecretMetadata> {
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

  async close(): Promise<void> {
    this._save();
  }
}
