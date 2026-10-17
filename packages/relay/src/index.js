// ─── Sola Relay Server ───
// Zero-knowledge data proxy. Credentials stay local. Data never leaves.

import { createServer } from 'http';
import { readFileSync, appendFileSync, existsSync } from 'fs';
import { join } from 'path';

const { version: RELAY_VERSION } = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8')
);

// Only single-statement read-only SELECT queries are permitted on SQL connectors.
export function isReadOnlySql(sql) {
  if (typeof sql !== 'string') return false;
  const trimmed = sql.trim().replace(/;+\s*$/, '');
  if (!trimmed) return false;
  const withoutStrings = trimmed
    .replace(/'(?:''|\\.|[^'])*'/g, "''")
    .replace(/"(?:""|\\.|[^"])*"/g, '""');
  const withoutComments = withoutStrings
    .replace(/--[^\r\n]*/g, ' ')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .trim();
  if (!/^SELECT\b/i.test(withoutComments)) return false;
  if (withoutComments.includes(';')) return false;
  // INTO covers SELECT ... INTO, which creates a table (PostgreSQL) or writes a file
  // (MySQL INTO OUTFILE). This is defence in depth: give the relay a read-only role.
  if (/\b(INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE|CREATE|GRANT|REVOKE|COPY|CALL|EXEC|EXECUTE|INTO)\b/i.test(withoutComments)) {
    return false;
  }
  return true;
}

// ─── Connectors ───
const connectors = new Map();

class PostgresConnector {
  constructor(config) {
    this.config = config;
    this.pool = null;
  }

  async connect() {
    const { default: pg } = await import('pg');
    this.pool = new pg.Pool(this.config);
    // Verify connection
    const client = await this.pool.connect();
    client.release();
  }

  async query(sql, params = []) {
    const result = await this.pool.query(sql, params);
    return { rows: result.rows, rowCount: result.rowCount };
  }

  async schema() {
    const result = await this.pool.query(`
      SELECT table_name, column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      ORDER BY table_name, ordinal_position
    `);
    const tables = {};
    for (const row of result.rows) {
      if (!tables[row.table_name]) tables[row.table_name] = [];
      tables[row.table_name].push({ name: row.column_name, type: row.data_type });
    }
    return tables;
  }

  async disconnect() {
    if (this.pool) await this.pool.end();
  }
}

class GoogleSheetsConnector {
  constructor(config) {
    this.sheetId = config.sheetId || config.host || config.source;
    this.apiKey = config.apiKey || null;
  }

  async connect() {
    // Validate sheetId exists
    if (!this.sheetId) throw new Error("Google Sheet ID is required for sheet:// relay");
  }

  async query(options = {}) {
    const url = `https://docs.google.com/spreadsheets/d/${this.sheetId}/gviz/tq?tqx=out:csv`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch Google Sheet (${res.status} ${res.statusText})`);
    
    const csvText = await res.text();
    const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length === 0) return { rows: [], rowCount: 0 };

    const parseCsvLine = (line) => {
      const result = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"' && (i === 0 || line[i - 1] !== '\\')) {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim().replace(/^"|"$/g, ''));
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim().replace(/^"|"$/g, ''));
      return result;
    };

    const headers = parseCsvLine(lines[0]);
    const rows = [];

    for (let i = 1; i < lines.length; i++) {
      const values = parseCsvLine(lines[i]);
      const row = {};
      headers.forEach((header, idx) => {
        const val = values[idx] || '';
        const numVal = Number(val.replace(/[\$,]/g, ''));
        row[header] = !isNaN(numVal) && val !== '' ? numVal : val;
      });
      rows.push(row);
    }

    return { rows, rowCount: rows.length, headers };
  }

  async schema() {
    const { headers } = await this.query();
    return { "sheet_data": headers.map(h => ({ name: h, type: 'inferred' })) };
  }

  async disconnect() {}
}

class ServiceNowConnector {
  constructor(config) {
    this.instance = config.instance || config.host || process.env.SN_INSTANCE || '';
    this.username = config.username || config.user || process.env.SN_USERNAME || '';
    this.password = config.password || process.env.SN_PASSWORD || '';
    this.token = config.token || config.bearerToken || process.env.SN_BEARER_TOKEN || '';
    this.defaultTable = config.table || 'incident';
  }

  async connect() {
    if (!this.instance) {
      throw new Error("ServiceNow instance URL or domain is required (e.g. 'dev12345.service-now.com')");
    }
  }

  async query(options = {}) {
    const table = options.table || options.source || this.defaultTable;
    const query = options.query || options.sysparm_query || 'priority=1^state!=7^ORDERBYDESCsys_created_on';
    const limit = options.limit || options.sysparm_limit || 20;
    const fields = options.fields || 'number,short_description,priority,state,assigned_to,assignment_group,sys_created_on';

    const baseUrl = this.instance.startsWith('http') ? this.instance : `https://${this.instance}.service-now.com`;
    const endpoint = `${baseUrl}/api/now/table/${table}?sysparm_query=${encodeURIComponent(query)}&sysparm_limit=${limit}&sysparm_display_value=true&sysparm_fields=${encodeURIComponent(fields)}`;

    const headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    } else if (this.username && this.password) {
      const auth = Buffer.from(`${this.username}:${this.password}`).toString('base64');
      headers['Authorization'] = `Basic ${auth}`;
    }

    const res = await fetch(endpoint, { headers });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`ServiceNow API error (${res.status} ${res.statusText}): ${errText}`);
    }

    const data = await res.json();
    const records = data.result || [];
    return { rows: records, rowCount: records.length, table };
  }

  async mutate(action, payload = {}) {
    const table = payload.table || this.defaultTable;
    const sysId = payload.sys_id || payload.id;
    if (!sysId) throw new Error("sys_id is required to mutate ServiceNow record");

    const baseUrl = this.instance.startsWith('http') ? this.instance : `https://${this.instance}.service-now.com`;
    const endpoint = `${baseUrl}/api/now/table/${table}/${sysId}`;

    const headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    } else if (this.username && this.password) {
      const auth = Buffer.from(`${this.username}:${this.password}`).toString('base64');
      headers['Authorization'] = `Basic ${auth}`;
    }

    const body = payload.data || payload.fields || {};
    const res = await fetch(endpoint, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`ServiceNow mutation error (${res.status} ${res.statusText}): ${errText}`);
    }

    const data = await res.json();
    return { success: true, result: data.result };
  }

  async schema() {
    return {
      "incident": [
        { name: "number", type: "string" },
        { name: "short_description", type: "string" },
        { name: "priority", type: "string" },
        { name: "state", type: "string" },
        { name: "assigned_to", type: "string" },
        { name: "urgency", type: "string" },
        { name: "impact", type: "string" }
      ],
      "change_request": [
        { name: "number", type: "string" },
        { name: "short_description", type: "string" },
        { name: "risk", type: "string" },
        { name: "state", type: "string" },
        { name: "start_date", type: "string" }
      ]
    };
  }

  async disconnect() {}
}

class MySQLConnector {
  constructor(config) {
    this.config = config;
    this.pool = null;
  }

  async connect() {
    const mysql = await import('mysql2/promise');
    this.pool = mysql.createPool(this.config);
    // Verify
    const conn = await this.pool.getConnection();
    conn.release();
  }

  async query(sql, params = []) {
    const [rows] = await this.pool.execute(sql, params);
    return { rows, rowCount: rows.length };
  }

  async schema() {
    const [rows] = await this.pool.execute(`
      SELECT TABLE_NAME as table_name, COLUMN_NAME as column_name, DATA_TYPE as data_type
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE()
      ORDER BY TABLE_NAME, ORDINAL_POSITION
    `);
    const tables = {};
    for (const row of rows) {
      if (!tables[row.table_name]) tables[row.table_name] = [];
      tables[row.table_name].push({ name: row.column_name, type: row.data_type });
    }
    return tables;
  }

  async disconnect() {
    if (this.pool) await this.pool.end();
  }
}

// ─── Audit Logger ───
function auditLog(entry) {
  const line = JSON.stringify({
    timestamp: new Date().toISOString(),
    ...entry
  }) + '\n';
  
  try {
    appendFileSync('sola-relay-audit.log', line);
  } catch (e) {
    // Fallback to console
    console.log('[AUDIT]', line.trim());
  }
}

// ─── Connection Store ───
export const connections = new Map();

export function addConnection(name, type, config) {
  let connector;
  switch (type) {
    case 'postgres':
      connector = new PostgresConnector(config);
      break;
    case 'mysql':
      connector = new MySQLConnector(config);
      break;
    case 'sheet':
    case 'googlesheets':
      connector = new GoogleSheetsConnector(config);
      break;
    case 'servicenow':
    case 'now':
      connector = new ServiceNowConnector(config);
      break;
    default:
      throw new Error(`Unsupported connector type: ${type}`);
  }
  connections.set(name, { type, connector, config, status: 'disconnected' });
}

async function connectAll() {
  for (const [name, conn] of connections) {
    try {
      await conn.connector.connect();
      conn.status = 'connected';
      console.log(`  ✓ Connected: ${name} (${conn.type})`);
    } catch (e) {
      conn.status = 'error';
      console.error(`  ✗ Failed: ${name} — ${e.message}`);
    }
  }
}

// ─── Load connections from config ───
function loadConfig() {
  const configPath = join(process.cwd(), 'sola-relay.json');
  if (existsSync(configPath)) {
    const config = JSON.parse(readFileSync(configPath, 'utf-8'));
    if (config.connections) {
      for (const [name, conn] of Object.entries(config.connections)) {
        addConnection(name, conn.type, conn);
      }
    }
    return config;
  }
  return {};
}

// ─── HTTP Server ───
export class RelayServer {
  constructor(options = {}) {
    this.port = options.port || 4040;
  }

  start() {
    // Load config
    loadConfig();

    const server = createServer(async (req, res) => {
      // CORS — restrict to trusted origins (sola-air.dev, localhost variants, chrome-extension)
      const origin = req.headers['origin'];
      const staticAllowed = [
        'https://www.sola-air.dev',
        'https://sola-air.dev',
        'http://localhost:5173',
        'http://localhost:4173',
        'http://127.0.0.1:5173'
      ];
      const isDynLocalhost = origin && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
      const isExtension = origin && /^chrome-extension:\/\/[a-z]{32}$/.test(origin);
      const allowedOrigin = (isDynLocalhost || isExtension || staticAllowed.includes(origin)) ? origin : null;

      if (allowedOrigin) {
        res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
        res.setHeader('Vary', 'Origin');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      }

      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }

      const url = new URL(req.url, `http://localhost:${this.port}`);

      // ── Status endpoint ──
      if (url.pathname === '/api/status' && req.method === 'GET') {
        const status = {};
        for (const [name, conn] of connections) {
          status[name] = { type: conn.type, status: conn.status };
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ relay: 'sola-relay', version: RELAY_VERSION, connections: status }));
        return;
      }

      // ── Schema endpoint ──
      if (url.pathname === '/api/schema' && req.method === 'GET') {
        const source = url.searchParams.get('source');
        if (!source || !/^[a-zA-Z0-9_]+$/.test(source)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid source identifier' }));
          return;
        }
        const conn = connections.get(source);
        if (!conn) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: `Source '${source}' not found` }));
          return;
        }
        try {
          const schema = await conn.connector.schema();
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ source, schema }));
        } catch (e) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Schema fetch failed' }));
        }
        return;
      }

      // ── Query endpoint ──
      if (url.pathname === '/api/query' && req.method === 'POST') {
        let body = '';
        let bodySize = 0;
        const MAX_BODY_BYTES = 1024 * 1024; // 1 MB limit

        for await (const chunk of req) {
          bodySize += chunk.length;
          if (bodySize > MAX_BODY_BYTES) {
            res.writeHead(413, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Payload too large. Maximum size is 1MB.' }));
            return;
          }
          body += chunk;
        }
        
        try {
          const parsed = JSON.parse(body);
          const { source, query, limit } = parsed;

          if (!source || !/^[a-zA-Z0-9_]+$/.test(source)) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Invalid source identifier' }));
            return;
          }

          const conn = connections.get(source);

          if (!conn) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: `Source '${source}' not found` }));
            return;
          }

          if (conn.status !== 'connected') {
            res.writeHead(503, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: `Source '${source}' is not connected` }));
            return;
          }

          const safeLimit = Math.min(Math.max(1, parseInt(limit, 10) || 100), 1000);

          const isNonSql =
            conn.type === 'sheet' ||
            conn.type === 'googlesheets' ||
            conn.type === 'servicenow' ||
            conn.type === 'now';

          let result;
          if (isNonSql) {
            result = await conn.connector.query({
              ...(typeof query === 'object' && query !== null ? query : { query }),
              limit: safeLimit
            });
          } else if (typeof query === 'object' && query !== null && typeof query.text === 'string') {
            if (!isReadOnlySql(query.text)) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Only SELECT queries are permitted' }));
              return;
            }
            const params = Array.isArray(query.params) ? query.params : [];
            result = await conn.connector.query(query.text, params);
          } else if (typeof query === 'string') {
            if (!isReadOnlySql(query)) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Only SELECT queries are permitted' }));
              return;
            }
            result = await conn.connector.query(query);
          } else if (query == null) {
            result = await conn.connector.query(`SELECT * FROM ${source} LIMIT ${safeLimit}`);
          } else {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Only SELECT queries are permitted' }));
            return;
          }

          // Local audit log
          auditLog({
            action: 'QUERY',
            source,
            query: typeof query === 'object' ? 'PARAMETERIZED_QUERY' : 'DEFAULT_SELECT',
            rowCount: result?.rowCount || 0,
            userAgent: req.headers['user-agent']
          });

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(result));

        } catch (e) {
          auditLog({ action: 'QUERY_ERROR', error: e.message });
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Query failed' }));
        }
        return;
      }

      // ── Dashboard (root) ──
      if (url.pathname === '/' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`<!DOCTYPE html>
<html>
<head>
  <title>Sola Relay</title>
  <style>
    * { margin: 0; box-sizing: border-box; }
    body { font-family: system-ui, sans-serif; background: #f8fafc; color: #1e293b; padding: 40px; }
    h1 { font-size: 2rem; font-weight: 800; margin-bottom: 8px; }
    .sub { color: #94a3b8; margin-bottom: 32px; }
    .card { background: white; border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px; margin-bottom: 16px; }
    .status { display: inline-block; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 700; text-transform: uppercase; }
    .connected { background: #ecfdf5; color: #059669; }
    .disconnected { background: #fef2f2; color: #dc2626; }
    code { background: #f1f5f9; padding: 2px 8px; border-radius: 6px; font-size: 13px; }
  </style>
</head>
<body>
  <h1>☀️ Sola Relay</h1>
  <p class="sub">Your data stays here. Always.</p>
  <div class="card">
    <p><strong>Status:</strong> Running on port ${this.port}</p>
    <p><strong>Connections:</strong> ${connections.size}</p>
    <p><strong>Config:</strong> <code>sola-relay.json</code></p>
  </div>
  <div class="card">
    <p><strong>API Endpoints:</strong></p>
    <p>POST <code>/api/query</code> — Execute a query</p>
    <p>GET <code>/api/schema?source=name</code> — Get table schema (metadata only)</p>
    <p>GET <code>/api/status</code> — Connection status</p>
  </div>
</body>
</html>`);
        return;
      }

      res.writeHead(404);
      res.end('Not found');
    });

    this.server = server;
    // Connect to all configured data sources
    connectAll().then(() => {
      server.listen(this.port, '127.0.0.1', () => {
        console.log(`  Relay listening on http://127.0.0.1:${this.port}\n`);
      });
    });
    return server;
  }
}
