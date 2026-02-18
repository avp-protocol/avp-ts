<p align="center">
  <img src="https://raw.githubusercontent.com/avp-protocol/spec/main/assets/avp-shield.svg" alt="AVP Shield" width="80" />
</p>

<h1 align="center">avp-ts</h1>

<p align="center">
  <strong>TypeScript implementation of Agent Vault Protocol</strong><br>
  Standard conformance · Browser & Node.js · MCP native
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@avp-protocol/avp"><img src="https://img.shields.io/npm/v/@avp-protocol/avp?style=flat-square&color=00D4AA" alt="npm" /></a>
  <a href="https://www.npmjs.com/package/@avp-protocol/avp"><img src="https://img.shields.io/node/v/@avp-protocol/avp?style=flat-square" alt="Node" /></a>
  <a href="https://github.com/avp-protocol/avp-ts/actions"><img src="https://img.shields.io/github/actions/workflow/status/avp-protocol/avp-ts/ci.yml?style=flat-square" alt="CI" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-Apache_2.0-blue?style=flat-square" alt="License" /></a>
</p>

---

## Overview

`avp-ts` is the official TypeScript implementation of the [Agent Vault Protocol (AVP)](https://github.com/avp-protocol/spec). It runs in Node.js, browsers, and edge runtimes, with native MCP (Model Context Protocol) support.

## Features

- **Standard AVP Conformance** — All 7 core operations
- **Universal** — Node.js, browsers, Deno, Bun, Cloudflare Workers
- **MCP Native** — First-class Model Context Protocol support
- **Type Safe** — Full TypeScript types, zero `any`
- **Tree Shakeable** — Import only what you need

## Installation

```bash
npm install @avp-protocol/avp
# or
yarn add @avp-protocol/avp
# or
pnpm add @avp-protocol/avp
```

## Quick Start

```typescript
import { Vault } from '@avp-protocol/avp';

// Create vault instance
const vault = new Vault('avp.toml');

// Authenticate
await vault.authenticate();

// Store a secret
await vault.store('anthropic_api_key', 'sk-ant-...');

// Retrieve a secret
const apiKey = await vault.retrieve('anthropic_api_key');
```

## Backend Selection

```typescript
import { Vault, FileBackend, KeychainBackend, RemoteBackend } from '@avp-protocol/avp';

// File backend (encrypted)
const vault = new Vault({
  backend: new FileBackend({
    path: '~/.avp/secrets.enc',
    cipher: 'aes-256-gcm'
  })
});

// OS Keychain (Node.js only)
const vault = new Vault({
  backend: new KeychainBackend()
});

// Remote vault
const vault = new Vault({
  backend: new RemoteBackend({
    url: 'https://vault.company.com',
    token: 'hvs.xxx'
  })
});
```

## MCP Integration

AVP-TS includes a built-in MCP server for AI agents:

```typescript
import { createMCPServer } from '@avp-protocol/avp/mcp';

// Create MCP server with AVP tools
const server = createMCPServer({
  config: 'avp.toml'
});

// Tools exposed:
// - avp_discover
// - avp_authenticate
// - avp_store
// - avp_retrieve
// - avp_delete
// - avp_list
// - avp_rotate
```

Use with Claude, ChatGPT, or any MCP-compatible agent:

```json
{
  "mcpServers": {
    "avp": {
      "command": "npx",
      "args": ["@avp-protocol/avp-mcp"]
    }
  }
}
```

## Browser Usage

```typescript
import { Vault, MemoryBackend } from '@avp-protocol/avp/browser';

// Browser-safe in-memory backend
const vault = new Vault({
  backend: new MemoryBackend()
});

// Or connect to remote vault
const vault = new Vault({
  backend: new RemoteBackend({
    url: 'https://vault.company.com'
  })
});
```

## Migration

```typescript
import { migrate } from '@avp-protocol/avp';

// Migrate from file to keychain
await migrate({
  source: new FileBackend({ path: '~/.avp/secrets.enc' }),
  target: new KeychainBackend()
});
```

## API Reference

### Vault

| Method | Description |
|--------|-------------|
| `discover()` | Query vault capabilities |
| `authenticate(options?)` | Establish session |
| `store(name, value, options?)` | Store a secret |
| `retrieve(name)` | Retrieve a secret |
| `delete(name)` | Delete a secret |
| `list(filters?)` | List secrets |
| `rotate(name, strategy)` | Rotate a secret |

## Conformance

| Level | Status |
|-------|--------|
| AVP Core | ✅ Complete |
| AVP Full | ✅ Complete |
| AVP Hardware | ⚠️ Via WebUSB/bridge |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup.

## License

Apache 2.0 — see [LICENSE](LICENSE).

---

<p align="center">
  <a href="https://github.com/avp-protocol/spec">Specification</a> ·
  <a href="https://avp-protocol.github.io/avp-ts">Documentation</a> ·
  <a href="https://github.com/avp-protocol/avp-ts/issues">Issues</a>
</p>
