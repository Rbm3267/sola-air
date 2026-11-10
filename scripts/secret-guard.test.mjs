import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scanText } from './secret-guard.mjs';

// Built from pieces so this file does not itself look like a key.
const googleKey = 'AI' + 'za' + 'A'.repeat(35);
const npmToken = 'npm' + '_' + 'a1'.repeat(18);
const anthropicKey = 'sk-' + 'ant-' + 'x'.repeat(30);

test('finds a Google API key and reports the line, not the value', () => {
  const hits = scanText(`const a = 1;\nconst k = "${googleKey}";`);
  assert.deepEqual(hits, [{ line: 2, kind: 'Google API key' }]);
});

test('finds npm and Anthropic tokens', () => {
  assert.equal(scanText(npmToken)[0].kind, 'npm token');
  assert.equal(scanText(anthropicKey)[0].kind, 'Anthropic API key');
});

test('finds a private key block', () => {
  assert.equal(scanText('-----BEGIN ' + 'PRIVATE KEY-----')[0].kind, 'Private key block');
});

test('ignores ordinary text, the CI placeholder and the variable name', () => {
  assert.deepEqual(scanText('GEMINI_API_KEY=ci-placeholder\nimport { GEMINI_API_KEY } from "x"\nAIza is a prefix'), []);
});
