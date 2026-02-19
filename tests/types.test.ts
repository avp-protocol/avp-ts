import { describe, it, expect } from "vitest";

import {
  validateSecretName,
  validateWorkspaceId,
  isSessionExpired,
  isSessionValid,
  Session,
} from "../src/index.js";

describe("validateSecretName", () => {
  it("accepts valid names", () => {
    const validNames = [
      "api_key",
      "API_KEY",
      "myKey123",
      "key.name",
      "key-name",
      "a",
      "A",
      "key_with_underscores",
      "key-with-dashes",
      "key.with.dots",
    ];

    for (const name of validNames) {
      expect(validateSecretName(name), `${name} should be valid`).toBe(true);
    }
  });

  it("rejects invalid names", () => {
    const invalidNames = [
      "",
      "123key",
      "_key",
      ".key",
      "-key",
      "key with spaces",
      "key/path",
      "key\\path",
      "a".repeat(256),
    ];

    for (const name of invalidNames) {
      expect(validateSecretName(name), `${name} should be invalid`).toBe(false);
    }
  });

  it("accepts max length name", () => {
    expect(validateSecretName("a".repeat(255))).toBe(true);
    expect(validateSecretName("a".repeat(256))).toBe(false);
  });
});

describe("validateWorkspaceId", () => {
  it("accepts valid workspace IDs", () => {
    const validIds = [
      "default",
      "my-project",
      "my_project",
      "my.project",
      "project/subproject",
      "production/us-east/api",
      "123",
      "a",
    ];

    for (const id of validIds) {
      expect(validateWorkspaceId(id), `${id} should be valid`).toBe(true);
    }
  });

  it("rejects invalid workspace IDs", () => {
    const invalidIds = ["", "/leading_slash", "a".repeat(256)];

    for (const id of invalidIds) {
      expect(validateWorkspaceId(id), `${id} should be invalid`).toBe(false);
    }
  });
});

describe("Session expiration", () => {
  it("detects non-expired session", () => {
    const session: Session = {
      sessionId: "avp_sess_test",
      workspace: "default",
      backend: "memory-0",
      agentId: "test",
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
      ttlSeconds: 3600,
    };

    expect(isSessionExpired(session)).toBe(false);
    expect(isSessionValid(session)).toBe(true);
  });

  it("detects expired session", () => {
    const session: Session = {
      sessionId: "avp_sess_test",
      workspace: "default",
      backend: "memory-0",
      agentId: "test",
      createdAt: new Date(Date.now() - 7200000), // 2 hours ago
      expiresAt: new Date(Date.now() - 3600000), // 1 hour ago
      ttlSeconds: 3600,
    };

    expect(isSessionExpired(session)).toBe(true);
    expect(isSessionValid(session)).toBe(false);
  });
});
