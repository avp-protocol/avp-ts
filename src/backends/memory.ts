/**
 * In-memory backend for AVP (useful for testing).
 */

import {
  BackendType,
  Capabilities,
  Limits,
  Secret,
  SecretMetadata,
} from "../types.js";
import { BackendBase, StoreResult, RetrieveResult, ListResult } from "./base.js";
import { SecretNotFoundError } from "../errors.js";

interface StoredSecret {
  value: Uint8Array;
  metadata: SecretMetadata;
}

/**
 * In-memory backend for testing and development.
 *
 * WARNING: Secrets are stored in plaintext in memory.
 * Do not use in production.
 */
export class MemoryBackend extends BackendBase {
  private readonly _backendId: string;
  private readonly _secrets: Map<string, Map<string, StoredSecret>>;

  constructor(backendId: string = "memory-0") {
    super();
    this._backendId = backendId;
    this._secrets = new Map();
  }

  get backendType(): BackendType {
    return BackendType.MEMORY;
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
      migration: false,
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
      type: "memory",
      warning: "In-memory storage - data lost on restart",
    };
  }

  async store(
    workspace: string,
    name: string,
    value: Uint8Array,
    labels?: Record<string, string>,
    expiresAt?: Date
  ): Promise<StoreResult> {
    if (!this._secrets.has(workspace)) {
      this._secrets.set(workspace, new Map());
    }

    const ws = this._secrets.get(workspace)!;
    const now = new Date();
    const existing = ws.get(name);
    const created = !existing;

    let version: number;
    let createdAt: Date;

    if (created) {
      version = 1;
      createdAt = now;
    } else {
      version = existing!.metadata.version + 1;
      createdAt = existing!.metadata.createdAt;
    }

    const metadata: SecretMetadata = {
      createdAt,
      updatedAt: now,
      backend: BackendType.MEMORY,
      version,
      labels: labels || {},
      expiresAt,
    };

    ws.set(name, { value: new Uint8Array(value), metadata });

    return { created, version };
  }

  async retrieve(
    workspace: string,
    name: string,
    version?: number
  ): Promise<RetrieveResult> {
    const ws = this._secrets.get(workspace);
    if (!ws) {
      throw new SecretNotFoundError(`Secret '${name}' not found`);
    }

    const secret = ws.get(name);
    if (!secret) {
      throw new SecretNotFoundError(`Secret '${name}' not found`);
    }

    // Check expiration
    if (secret.metadata.expiresAt && new Date() > secret.metadata.expiresAt) {
      ws.delete(name);
      throw new SecretNotFoundError(`Secret '${name}' not found`);
    }

    // Version check (simplified - we don't keep version history)
    if (version !== undefined && version !== secret.metadata.version) {
      throw new SecretNotFoundError(`Secret '${name}' version ${version} not found`);
    }

    return {
      value: new Uint8Array(secret.value),
      version: secret.metadata.version,
    };
  }

  async delete(workspace: string, name: string): Promise<boolean> {
    const ws = this._secrets.get(workspace);
    if (!ws) {
      return false;
    }

    const secret = ws.get(name);
    if (!secret) {
      return false;
    }

    // Zero out the value before deleting
    secret.value.fill(0);

    ws.delete(name);
    return true;
  }

  async listSecrets(
    workspace: string,
    filterLabels?: Record<string, string>,
    cursor?: string,
    limit: number = 100
  ): Promise<ListResult> {
    const ws = this._secrets.get(workspace);
    if (!ws) {
      return { secrets: [], cursor: undefined };
    }

    const now = new Date();
    const secrets: Secret[] = [];

    for (const [name, stored] of ws) {
      // Skip expired secrets
      if (stored.metadata.expiresAt && now > stored.metadata.expiresAt) {
        continue;
      }

      // Apply label filter
      if (filterLabels) {
        const match = Object.entries(filterLabels).every(
          ([k, v]) => stored.metadata.labels[k] === v
        );
        if (!match) continue;
      }

      secrets.push({
        name,
        workspace,
        metadata: stored.metadata,
        // Never include value in LIST
      });
    }

    // Sort by name for consistent ordering
    secrets.sort((a, b) => a.name.localeCompare(b.name));

    // Handle pagination
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
    const ws = this._secrets.get(workspace);
    if (!ws) {
      throw new SecretNotFoundError(`Secret '${name}' not found`);
    }

    const secret = ws.get(name);
    if (!secret) {
      throw new SecretNotFoundError(`Secret '${name}' not found`);
    }

    // Check expiration
    if (secret.metadata.expiresAt && new Date() > secret.metadata.expiresAt) {
      ws.delete(name);
      throw new SecretNotFoundError(`Secret '${name}' not found`);
    }

    return { ...secret.metadata };
  }

  /** Clear all secrets (for testing) */
  clear(): void {
    this._secrets.clear();
  }
}
