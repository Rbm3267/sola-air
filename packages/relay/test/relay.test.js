import assert from 'node:assert';
import { describe, it, before, after } from 'node:test';
import { readFileSync } from 'node:fs';
import { RelayServer, connections, isReadOnlySql } from '../src/index.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

describe('isReadOnlySql', () => {
  it('accepts single-statement SELECT queries', () => {
    assert.strictEqual(isReadOnlySql('SELECT * FROM metrics'), true);
    assert.strictEqual(isReadOnlySql('  select id, name from users where id = $1; '), true);
    assert.strictEqual(isReadOnlySql("SELECT ';' AS semi FROM dual"), true);
  });

  it('rejects non-SELECT and mutating statements', () => {
    assert.strictEqual(isReadOnlySql('DELETE FROM users'), false);
    assert.strictEqual(isReadOnlySql('DROP TABLE users'), false);
    assert.strictEqual(isReadOnlySql('UPDATE users SET role = \'admin\''), false);
    assert.strictEqual(isReadOnlySql('INSERT INTO logs VALUES (1)'), false);
    assert.strictEqual(isReadOnlySql(''), false);
    assert.strictEqual(isReadOnlySql(null), false);
  });

  it('rejects stacked semicolon queries', () => {
    assert.strictEqual(isReadOnlySql('SELECT 1; DROP TABLE users'), false);
    assert.strictEqual(isReadOnlySql('SELECT * FROM users; DELETE FROM users;'), false);
  });
});

describe('RelayServer HTTP query guard & connectors', () => {
  let server;
  let baseUrl;
  const sqlCalls = [];
  const snCalls = [];

  before(async () => {
    connections.clear();
    connections.set('pg_main', {
      type: 'postgres',
      status: 'connected',
      connector: {
        async connect() {},
        async query(sql, params = []) {
          sqlCalls.push({ sql, params });
          return { rows: [{ ok: 1 }], rowCount: 1 };
        }
      }
    });
    connections.set('sn_prod', {
      type: 'servicenow',
      status: 'connected',
      connector: {
        async connect() {},
        async query(options) {
          snCalls.push(options);
          return { rows: [{ number: 'INC001' }], rowCount: 1 };
        }
      }
    });

    const relay = new RelayServer({ port: 0 });
    server = relay.start();
    await new Promise((resolve) => {
      if (server.listening) return resolve();
      server.once('listening', resolve);
    });
    const addr = server.address();
    baseUrl = `http://127.0.0.1:${addr.port}`;
  });

  after(async () => {
    connections.clear();
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  it('reports the package.json version on /api/status', async () => {
    const res = await fetch(`${baseUrl}/api/status`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.version, pkg.version);
  });

  it('blocks non-SELECT and stacked queries in both string and object form', async () => {
    for (const badQuery of [
      'DROP TABLE users',
      'SELECT 1; DROP TABLE users',
      { text: 'DELETE FROM users WHERE id = $1', params: [1] },
      { text: 'SELECT 1; DELETE FROM users', params: [] }
    ]) {
      const res = await fetch(`${baseUrl}/api/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: 'pg_main', query: badQuery })
      });
      assert.strictEqual(res.status, 400);
    }
  });

  it('allows read-only parameterized SELECT queries', async () => {
    sqlCalls.length = 0;
    const res = await fetch(`${baseUrl}/api/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source: 'pg_main',
        query: { text: 'SELECT * FROM users WHERE id = $1', params: [42] }
      })
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(sqlCalls.length, 1);
    assert.strictEqual(sqlCalls[0].sql, 'SELECT * FROM users WHERE id = $1');
    assert.deepStrictEqual(sqlCalls[0].params, [42]);
  });

  it('passes an options object with limit to ServiceNow/GoogleSheets connectors', async () => {
    snCalls.length = 0;
    const res = await fetch(`${baseUrl}/api/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source: 'sn_prod',
        query: { table: 'change_request', query: 'active=true' },
        limit: 15
      })
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(snCalls.length, 1);
    assert.deepStrictEqual(snCalls[0], {
      table: 'change_request',
      query: 'active=true',
      limit: 15
    });
  });
});
