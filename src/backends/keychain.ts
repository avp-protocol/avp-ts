/**
 * OS Keychain backend for AVP.
 *
 * Provides secure credential storage using the platform's native keychain:
 * - macOS: Keychain
 * - Linux: SecretService (gnome-keyring, KWallet)
 * - Windows: Windows Credential Manager
 */

import { BackendBase, StoreResult, RetrieveResult, ListResult } from "./base.js";
import {
  BackendType,
  Capabilities,
  Limits,
  Secret,
  SecretMetadata,
} from "../types.js";
import { SecretNotFoundError, BackendUnavailableError } from "../errors.js";
import * as os from "os";

// Keytar types (optional peer dependency)
interface Keytar {
  setPassword(service: string, account: string, password: string): Promise<void>;
  getPassword(service: string, account: string): Promise<string | null>;
  deletePassword(service: string, account: string): Promise<boolean>;
  findCredentials(service: string): Promise<Array<{ account: string; password: string }>>;
}

/** Metadata stored alongside secrets */
interface StoredMetadata {
  createdAt: string;
  updatedAt: string;
  version: number;
  labels: Record<string, string>;
  expiresAt?: string;
}

/**
 * OS Keychain-backed storage for AVP.
 *
 * Uses the operating system's native credential storage:
 * - macOS: Keychain Access
 * - Linux: SecretService API (gnome-keyring, KWallet, etc.)
 * - Windows: Windows Credential Manager
 *
 * Secrets are stored with service name "avp-{workspace}" and account name as the key.
 */
export class KeychainBackend extends BackendBase {
  private readonly _backendId: string;
  private readonly servicePrefix: string;
  private readonly metaServicePrefix: string;
  private readonly indexKey = "__avp_secret_index__";
  private keytar: Keytar | null = null;

  constructor(
    backendId: string = "keychain-0",
    servicePrefix: string = "avp"
  ) {
    super();
    this._backendId = backendId;
    this.servicePrefix = servicePrefix;
    this.metaServicePrefix = `${servicePrefix}-meta`;
  }

  private async getKeytar(): Promise<Keytar> {
    if (this.keytar) {
      return this.keytar;
    }

    try {
      // Dynamic import for optional dependency
      const keytarModule = await import("keytar");
      this.keytar = keytarModule.default || keytarModule;
      return this.keytar;
    } catch {
      throw new BackendUnavailableError(
        "Keychain backend requires the 'keytar' package. Install with: npm install keytar"
      );
    }
  }

  private serviceName(workspace: string): string {
    return `${this.servicePrefix}-${workspace}`;
  }

  private metaServiceName(workspace: string): string {
    return `${this.metaServicePrefix}-${workspace}`;
  }

  private async getIndex(workspace: string): Promise<string[]> {
    const keytar = await this.getKeytar();
    const service = this.metaServiceName(workspace);
    try {
      const indexJson = await keytar.getPassword(service, this.indexKey);
      if (indexJson) {
        return JSON.parse(indexJson);
      }
    } catch {
      // Ignore errors
    }
    return [];
  }

  private async saveIndex(workspace: string, names: string[]): Promise<void> {
    const keytar = await this.getKeytar();
    const service = this.metaServiceName(workspace);
    await keytar.setPassword(service, this.indexKey, JSON.stringify(names));
  }

  private async getStoredMetadata(workspace: string, name: string): Promise<StoredMetadata | null> {
    const keytar = await this.getKeytar();
    const service = this.metaServiceName(workspace);
    try {
      const metaJson = await keytar.getPassword(service, name);
      if (metaJson) {
        return JSON.parse(metaJson);
      }
    } catch {
      // Ignore errors
    }
    return null;
  }

  private async saveStoredMetadata(workspace: string, name: string, metadata: StoredMetadata): Promise<void> {
    const keytar = await this.getKeytar();
    const service = this.metaServiceName(workspace);
    await keytar.setPassword(service, name, JSON.stringify(metadata));
  }

  private async deleteStoredMetadata(workspace: string, name: string): Promise<void> {
    const keytar = await this.getKeytar();
    const service = this.metaServiceName(workspace);
    try {
      await keytar.deletePassword(service, name);
    } catch {
      // Ignore if doesn't exist
    }
  }

  get backendType(): BackendType {
    return BackendType.KEYCHAIN;
  }

  get backendId(): string {
    return this._backendId;
  }

  get capabilities(): Capabilities {
    return {
      attestation: false,
      rotation: true,
      injection: false,
      audit: false, // Keychain doesn't provide audit logs
      migration: true,
      implicitSessions: true,
      expiration: true,
      versioning: true,
    };
  }

  get limits(): Limits {
    // Keychain has per-item size limits that vary by platform
    return {
      maxSecretNameLength: 255,
      maxSecretValueLength: 16384, // Conservative limit
      maxLabelsPerSecret: 32,
      maxSecretsPerWorkspace: 1000,
      maxSessionTtlSeconds: 86400,
    };
  }

  getInfo(): Record<string, string> {
    const platform = os.platform();
    const backendInfo: Record<string, string> = {
      darwin: "macOS Keychain",
      linux: "SecretService (gnome-keyring/KWallet)",
      win32: "Windows Credential Manager",
    };

    return {
      platform,
      backend: backendInfo[platform] || `keytar (${platform})`,
      servicePrefix: this.servicePrefix,
    };
  }

  async store(
    workspace: string,
    name: string,
    value: Uint8Array,
    labels?: Record<string, string>,
    expiresAt?: Date
  ): Promise<StoreResult> {
    const keytar = await this.getKeytar();
    const service = this.serviceName(workspace);
    const now = new Date();

    // Check if exists
    const existingMeta = await this.getStoredMetadata(workspace, name);
    const created = existingMeta === null;

    let version: number;
    let createdAt: string;

    if (created) {
      version = 1;
      createdAt = now.toISOString();
    } else {
      version = (existingMeta.version || 0) + 1;
      createdAt = existingMeta.createdAt || now.toISOString();
    }

    // Store value as base64 string (keychain stores strings)
    const valueB64 = Buffer.from(value).toString("base64");
    await keytar.setPassword(service, name, valueB64);

    // Store metadata
    const metadata: StoredMetadata = {
      createdAt,
      updatedAt: now.toISOString(),
      version,
      labels: labels || {},
      expiresAt: expiresAt?.toISOString(),
    };
    await this.saveStoredMetadata(workspace, name, metadata);

    // Update index
    const index = await this.getIndex(workspace);
    if (!index.includes(name)) {
      index.push(name);
      await this.saveIndex(workspace, index);
    }

    return { created, version };
  }

  async retrieve(
    workspace: string,
    name: string,
    version?: number
  ): Promise<RetrieveResult> {
    const keytar = await this.getKeytar();
    const service = this.serviceName(workspace);

    // Get value
    const valueB64 = await keytar.getPassword(service, name);
    if (valueB64 === null) {
      throw new SecretNotFoundError(`Secret '${name}' not found`);
    }

    // Get metadata
    let metadata = await this.getStoredMetadata(workspace, name);
    if (metadata === null) {
      // Value exists but no metadata - create minimal metadata
      metadata = { createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), version: 1, labels: {} };
    }

    // Check expiration
    if (metadata.expiresAt) {
      const expiresAt = new Date(metadata.expiresAt);
      if (new Date() > expiresAt) {
        await this.delete(workspace, name);
        throw new SecretNotFoundError(`Secret '${name}' not found`);
      }
    }

    // Version check
    const currentVersion = metadata.version || 1;
    if (version !== undefined && version !== currentVersion) {
      throw new SecretNotFoundError(
        `Secret '${name}' version ${version} not found`
      );
    }

    const value = new Uint8Array(Buffer.from(valueB64, "base64"));
    return { value, version: currentVersion };
  }

  async delete(workspace: string, name: string): Promise<boolean> {
    const keytar = await this.getKeytar();
    const service = this.serviceName(workspace);

    // Check if exists
    const existing = await keytar.getPassword(service, name);
    if (existing === null) {
      return false;
    }

    // Delete value
    try {
      await keytar.deletePassword(service, name);
    } catch {
      return false;
    }

    // Delete metadata
    await this.deleteStoredMetadata(workspace, name);

    // Update index
    const index = await this.getIndex(workspace);
    const idx = index.indexOf(name);
    if (idx !== -1) {
      index.splice(idx, 1);
      await this.saveIndex(workspace, index);
    }

    return true;
  }

  async listSecrets(
    workspace: string,
    filterLabels?: Record<string, string>,
    cursor?: string,
    limit: number = 100
  ): Promise<ListResult> {
    const index = await this.getIndex(workspace);
    const secrets: Secret[] = [];
    const now = new Date();

    const sortedNames = [...index].sort();

    for (const name of sortedNames) {
      const metadataDict = await this.getStoredMetadata(workspace, name);
      if (metadataDict === null) {
        continue;
      }

      // Check expiration
      if (metadataDict.expiresAt) {
        const expiresAt = new Date(metadataDict.expiresAt);
        if (now > expiresAt) {
          // Clean up expired secret
          await this.delete(workspace, name);
          continue;
        }
      }

      // Apply label filter
      if (filterLabels) {
        const labels = metadataDict.labels || {};
        const match = Object.entries(filterLabels).every(
          ([k, v]) => labels[k] === v
        );
        if (!match) {
          continue;
        }
      }

      const metadata: SecretMetadata = {
        createdAt: new Date(metadataDict.createdAt),
        updatedAt: new Date(metadataDict.updatedAt),
        backend: BackendType.KEYCHAIN,
        version: metadataDict.version || 1,
        labels: metadataDict.labels || {},
        expiresAt: metadataDict.expiresAt ? new Date(metadataDict.expiresAt) : undefined,
      };

      secrets.push({
        name,
        workspace,
        metadata,
      });
    }

    // Pagination
    let start = 0;
    if (cursor) {
      const parsed = parseInt(cursor, 10);
      if (!isNaN(parsed)) {
        start = parsed;
      }
    }

    const end = start + limit;
    const page = secrets.slice(start, end);
    const nextCursor = end < secrets.length ? String(end) : undefined;

    return { secrets: page, cursor: nextCursor };
  }

  async getMetadata(workspace: string, name: string): Promise<SecretMetadata> {
    const metadataDict = await this.getStoredMetadata(workspace, name);
    if (metadataDict === null) {
      throw new SecretNotFoundError(`Secret '${name}' not found`);
    }

    // Check expiration
    if (metadataDict.expiresAt) {
      const expiresAt = new Date(metadataDict.expiresAt);
      if (new Date() > expiresAt) {
        await this.delete(workspace, name);
        throw new SecretNotFoundError(`Secret '${name}' not found`);
      }
    }

    return {
      createdAt: new Date(metadataDict.createdAt),
      updatedAt: new Date(metadataDict.updatedAt),
      backend: BackendType.KEYCHAIN,
      version: metadataDict.version || 1,
      labels: metadataDict.labels || {},
      expiresAt: metadataDict.expiresAt ? new Date(metadataDict.expiresAt) : undefined,
    };
  }

  async close(): Promise<void> {
    // No cleanup needed for keychain backend
  }
}
