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
    assert.strictEqual(isReadOnlySql('SELECT * INTO backup FROM users'), false);
    assert.strictEqual(isReadOnlySql("SELECT * FROM users INTO OUTFILE '/tmp/u.csv'"), false);
    assert.strictEqual(isReadOnlySql("SELECT 'into' AS word"), true);
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
  const restCalls = [];

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
    connections.set('pg-primary', {
      type: 'postgres',
      status: 'connected',
      connector: {
        async connect() {},
        async query(sql, params = []) {
          sqlCalls.push({ sql, params });
          return { rows: [{ id: 1 }], rowCount: 1 };
        }
      }
    });
    connections.set('rest_prod', {
      type: 'rest-table',
      status: 'connected',
      connector: {
        async connect() {},
        async query(options) {
          restCalls.push(options);
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

  it('passes an options object with limit to REST table / GoogleSheets connectors', async () => {
    restCalls.length = 0;
    const res = await fetch(`${baseUrl}/api/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source: 'rest_prod',
        query: { table: 'change_request', query: 'active=true' },
        limit: 15
      })
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(restCalls.length, 1);
    assert.deepStrictEqual(restCalls[0], {
      table: 'change_request',
      query: 'active=true',
      limit: 15
    });
  });

  const post = (body) => fetch(`${baseUrl}/api/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  it('reads a table through a connection alias: $data("alias:table")', async () => {
    sqlCalls.length = 0;
    const res = await post({ source: 'pg-primary:customers', limit: 25 });
    assert.strictEqual(res.status, 200);
    assert.deepStrictEqual((await res.json()).rows, [{ id: 1 }]);
    assert.strictEqual(sqlCalls[0].sql, 'SELECT * FROM customers LIMIT 25');
  });

  it('accepts a schema-qualified table', async () => {
    sqlCalls.length = 0;
    const res = await post({ source: 'pg-primary:public.customers' });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(sqlCalls[0].sql, 'SELECT * FROM public.customers LIMIT 100');
  });

  it('still reads the table named like the connection when no table is given', async () => {
    sqlCalls.length = 0;
    const res = await post({ source: 'pg_main' });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(sqlCalls[0].sql, 'SELECT * FROM pg_main LIMIT 100');
  });

  it('runs a custom SELECT on the aliased connection', async () => {
    sqlCalls.length = 0;
    const res = await post({ source: 'pg-primary:customers', query: { text: 'SELECT id FROM customers WHERE id = $1', params: [7] } });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(sqlCalls[0].sql, 'SELECT id FROM customers WHERE id = $1');
  });

  it('passes the table to non-SQL connectors when the query does not name one', async () => {
    restCalls.length = 0;
    const res = await post({ source: 'rest_prod:incident', query: { query: 'active=true' }, limit: 5 });
    assert.strictEqual(res.status, 200);
    assert.deepStrictEqual(restCalls[0], { table: 'incident', query: 'active=true', limit: 5 });
  });

  it('rejects malformed sources and table names that are not plain identifiers', async () => {
    sqlCalls.length = 0;
    for (const source of [
      'pg-primary:customers; DROP TABLE users',
      'pg-primary:customers--',
      'pg-primary:',
      ':customers',
      'pg-primary:a:b',
      'pg-primary:1customers',
      'pg-primary:a.b.c',
      'pg primary:customers',
      ''
    ]) {
      const res = await post({ source });
      assert.strictEqual(res.status, 400, `expected 400 for ${JSON.stringify(source)}`);
    }
    assert.strictEqual(sqlCalls.length, 0);
  });

  it('returns 404 for an unknown connection alias', async () => {
    const res = await post({ source: 'nope:customers' });
    assert.strictEqual(res.status, 404);
  });
});
