#!/usr/bin/env node

// ─── Sola Relay CLI ───
// Usage: npx sola-relay [--port 4040]

import { readFileSync } from 'fs';
import { RelayServer } from './index.js';

const { version: RELAY_VERSION } = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8')
);

const args = process.argv.slice(2);
const portIndex = args.indexOf('--port');
const port = portIndex !== -1 ? parseInt(args[portIndex + 1]) : 4040;

console.log(`
  ☀️  Sola Relay v${RELAY_VERSION}
  ─────────────────────
  Dashboard:  http://localhost:${port}
  API:        http://localhost:${port}/api/query
  Status:     http://localhost:${port}/api/status
  ─────────────────────
  Data never leaves your machine.
`);

const relay = new RelayServer({ port });
relay.start();
