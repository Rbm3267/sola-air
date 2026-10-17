#!/usr/bin/env node
// Bin entry for `sola-mcp`: always starts the stdio server. It used to guard
// startup with an argv[1] === import.meta.url check, which is false when npm
// runs the bin through a symlink (macOS, Linux), so the server never started.
// The tools and docs live in mcp-server.js so tests can import them safely.
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createMcpServer } from './mcp-server.js';

const server = createMcpServer();
await server.connect(new StdioServerTransport());
