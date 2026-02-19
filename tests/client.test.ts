import { describe, it, expect, beforeEach } from "vitest";

import {
  AVPClient,
  MemoryBackend,
  AuthMethod,
  ConformanceLevel,
  SecretNotFoundError,
  InvalidNameError,
  SessionExpiredError,
  SessionNotFoundError,
} from "../src/index.js";

describe("AVPClient", () => {
  let backend: MemoryBackend;
  let client: AVPClient;

  beforeEach(() => {
    backend = new MemoryBackend();
    client = new AVPClient(backend);
  });

  describe("DISCOVER", () => {
    it("returns version", () => {
      const response = client.discover();
      expect(response.version).toBe("0.1.0");
    });

    it("returns conformance level", () => {
      const response = client.discover();
      expect(response.conformance).toBe(ConformanceLevel.FULL);
    });

    it("returns backends", () => {
      const response = client.discover();
      expect(response.backends).toHaveLength(1);
      expect(response.backends[0].id).toBe("memory-0");
    });

    it("returns capabilities", () => {
      const response = client.discover();
      expect(response.capabilities.rotation).toBe(true);
      expect(response.capabilities.expiration).toBe(true);
    });
  });

  describe("AUTHENTICATE", () => {
    it("creates a session", () => {
      const session = client.authenticate({ workspace: "test" });
      expect(session.sessionId).toMatch(/^avp_sess_/);
      expect(session.workspace).toBe("test");
    });

    it("accepts agent ID", () => {
      const session = client.authenticate({ agentId: "my-agent/1.0" });
      expect(session.agentId).toBe("my-agent/1.0");
    });

    it("accepts TTL", () => {
      const session = client.authenticate({ requestedTtl: 300 });
      expect(session.ttlSeconds).toBe(300);
    });

    it("respects max TTL", () => {
      const session = client.authenticate({ requestedTtl: 999999 });
      expect(session.ttlSeconds).toBeLessThanOrEqual(86400);
    });

    it("terminates session", async () => {
      const session = client.authenticate();
      client.authenticate({
        authMethod: AuthMethod.TERMINATE,
        authData: { session_id: session.sessionId },
      });

      await expect(
        client.store(session.sessionId, "test", new TextEncoder().encode("value"))
      ).rejects.toThrow(SessionNotFoundError);
    });
  });

  describe("STORE", () => {
    it("stores a new secret", async () => {
      const session = client.authenticate();
      const response = await client.store(
        session.sessionId,
        "api_key",
        new TextEncoder().encode("secret123")
      );

      expect(response.name).toBe("api_key");
      expect(response.created).toBe(true);
      expect(response.version).toBe(1);
    });

    it("updates an existing secret", async () => {
      const session = client.authenticate();
      await client.store(
        session.sessionId,
        "api_key",
        new TextEncoder().encode("secret123")
      );
      const response = await client.store(
        session.sessionId,
        "api_key",
        new TextEncoder().encode("secret456")
      );

      expect(response.created).toBe(false);
      expect(response.version).toBe(2);
    });

    it("stores with labels", async () => {
      const session = client.authenticate();
      const response = await client.store(
        session.sessionId,
        "api_key",
        new TextEncoder().encode("secret"),
        { labels: { env: "prod", service: "api" } }
      );

      expect(response.created).toBe(true);
    });

    it("rejects invalid name", async () => {
      const session = client.authenticate();
      await expect(
        client.store(
          session.sessionId,
          "123invalid",
          new TextEncoder().encode("value")
        )
      ).rejects.toThrow(InvalidNameError);
    });

    it("rejects invalid session", async () => {
      await expect(
        client.store(
          "invalid_session",
          "test",
          new TextEncoder().encode("value")
        )
      ).rejects.toThrow(SessionNotFoundError);
    });
  });

  describe("RETRIEVE", () => {
    it("retrieves a secret", async () => {
      const session = client.authenticate();
      await client.store(
        session.sessionId,
        "api_key",
        new TextEncoder().encode("secret123")
      );

      const response = await client.retrieve(session.sessionId, "api_key");

      expect(response.name).toBe("api_key");
      expect(new TextDecoder().decode(response.value)).toBe("secret123");
      expect(response.version).toBe(1);
    });

    it("throws for nonexistent secret", async () => {
      const session = client.authenticate();
      await expect(
        client.retrieve(session.sessionId, "nonexistent")
      ).rejects.toThrow(SecretNotFoundError);
    });
  });

  describe("DELETE", () => {
    it("deletes an existing secret", async () => {
      const session = client.authenticate();
      await client.store(
        session.sessionId,
        "api_key",
        new TextEncoder().encode("secret")
      );

      const response = await client.delete(session.sessionId, "api_key");

      expect(response.name).toBe("api_key");
      expect(response.deleted).toBe(true);
    });

    it("returns false for nonexistent secret", async () => {
      const session = client.authenticate();
      const response = await client.delete(session.sessionId, "nonexistent");
      expect(response.deleted).toBe(false);
    });

    it("removes the secret", async () => {
      const session = client.authenticate();
      await client.store(
        session.sessionId,
        "api_key",
        new TextEncoder().encode("secret")
      );
      await client.delete(session.sessionId, "api_key");

      await expect(
        client.retrieve(session.sessionId, "api_key")
      ).rejects.toThrow(SecretNotFoundError);
    });
  });

  describe("LIST", () => {
    it("lists empty workspace", async () => {
      const session = client.authenticate();
      const response = await client.listSecrets(session.sessionId);
      expect(response.secrets).toHaveLength(0);
    });

    it("lists secrets", async () => {
      const session = client.authenticate();
      await client.store(session.sessionId, "key1", new TextEncoder().encode("v1"));
      await client.store(session.sessionId, "key2", new TextEncoder().encode("v2"));
      await client.store(session.sessionId, "key3", new TextEncoder().encode("v3"));

      const response = await client.listSecrets(session.sessionId);

      expect(response.secrets).toHaveLength(3);
      const names = response.secrets.map((s) => s.name);
      expect(names).toContain("key1");
      expect(names).toContain("key2");
      expect(names).toContain("key3");
    });

    it("does not include values", async () => {
      const session = client.authenticate();
      await client.store(session.sessionId, "key1", new TextEncoder().encode("secret"));

      const response = await client.listSecrets(session.sessionId);

      expect(response.secrets[0].value).toBeUndefined();
    });

    it("filters by labels", async () => {
      const session = client.authenticate();
      await client.store(session.sessionId, "key1", new TextEncoder().encode("v1"), {
        labels: { env: "prod" },
      });
      await client.store(session.sessionId, "key2", new TextEncoder().encode("v2"), {
        labels: { env: "dev" },
      });

      const response = await client.listSecrets(session.sessionId, {
        filterLabels: { env: "prod" },
      });

      expect(response.secrets).toHaveLength(1);
      expect(response.secrets[0].name).toBe("key1");
    });

    it("supports pagination", async () => {
      const session = client.authenticate();
      for (let i = 0; i < 10; i++) {
        await client.store(
          session.sessionId,
          `key${i.toString().padStart(2, "0")}`,
          new TextEncoder().encode("value")
        );
      }

      const response = await client.listSecrets(session.sessionId, { limit: 3 });

      expect(response.secrets).toHaveLength(3);
      expect(response.hasMore).toBe(true);
      expect(response.cursor).toBeDefined();

      const response2 = await client.listSecrets(session.sessionId, {
        limit: 3,
        cursor: response.cursor,
      });

      expect(response2.secrets).toHaveLength(3);
    });
  });

  describe("ROTATE", () => {
    it("rotates a secret", async () => {
      const session = client.authenticate();
      await client.store(
        session.sessionId,
        "api_key",
        new TextEncoder().encode("old_value")
      );

      const response = await client.rotate(
        session.sessionId,
        "api_key",
        new TextEncoder().encode("new_value")
      );

      expect(response.name).toBe("api_key");
      expect(response.version).toBe(2);
    });

    it("updates the value", async () => {
      const session = client.authenticate();
      await client.store(
        session.sessionId,
        "api_key",
        new TextEncoder().encode("old_value")
      );
      await client.rotate(
        session.sessionId,
        "api_key",
        new TextEncoder().encode("new_value")
      );

      const response = await client.retrieve(session.sessionId, "api_key");

      expect(new TextDecoder().decode(response.value)).toBe("new_value");
    });

    it("throws for nonexistent secret", async () => {
      const session = client.authenticate();
      await expect(
        client.rotate(
          session.sessionId,
          "nonexistent",
          new TextEncoder().encode("value")
        )
      ).rejects.toThrow(SecretNotFoundError);
    });
  });

  describe("Expiration", () => {
    it("does not retrieve expired secrets", async () => {
      const session = client.authenticate();
      const pastDate = new Date(Date.now() - 3600000); // 1 hour ago

      await client.store(
        session.sessionId,
        "api_key",
        new TextEncoder().encode("secret"),
        { expiresAt: pastDate }
      );

      await expect(
        client.retrieve(session.sessionId, "api_key")
      ).rejects.toThrow(SecretNotFoundError);
    });

    it("does not list expired secrets", async () => {
      const session = client.authenticate();
      const pastDate = new Date(Date.now() - 3600000);

      await client.store(
        session.sessionId,
        "expired_key",
        new TextEncoder().encode("secret"),
        { expiresAt: pastDate }
      );
      await client.store(
        session.sessionId,
        "valid_key",
        new TextEncoder().encode("secret")
      );

      const response = await client.listSecrets(session.sessionId);
      const names = response.secrets.map((s) => s.name);

      expect(names).toContain("valid_key");
      expect(names).not.toContain("expired_key");
    });
  });

  describe("Workspace Isolation", () => {
    it("isolates secrets by workspace", async () => {
      const session1 = client.authenticate({ workspace: "workspace1" });
      const session2 = client.authenticate({ workspace: "workspace2" });

      await client.store(
        session1.sessionId,
        "shared_name",
        new TextEncoder().encode("value1")
      );
      await client.store(
        session2.sessionId,
        "shared_name",
        new TextEncoder().encode("value2")
      );

      const response1 = await client.retrieve(session1.sessionId, "shared_name");
      const response2 = await client.retrieve(session2.sessionId, "shared_name");

      expect(new TextDecoder().decode(response1.value)).toBe("value1");
      expect(new TextDecoder().decode(response2.value)).toBe("value2");
    });
  });
});
