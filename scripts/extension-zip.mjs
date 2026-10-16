// Builds packages/sola-extension/sola-extension.zip from the extension source,
// and reads a zip back. The /preview page links straight to the committed zip, so
// it has to match the source; a test in packages/sola-extension/test compares the
// two. No zip library in the repo, so this writes the format directly with node:zlib.
//
//   node scripts/extension-zip.mjs        rebuild the committed zip
//
// Entries use forward-slash paths and a fixed timestamp, so a rebuild changes the
// file only when the source changed.

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { deflateRawSync, inflateRawSync } from 'node:zlib';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const EXTENSION_DIR = join(ROOT, 'packages/sola-extension');
export const ZIP_PATH = join(EXTENSION_DIR, 'sola-extension.zip');

// What ships in the extension. Tests, store assets and the zip itself do not.
const TOP_LEVEL = ['manifest.json', 'background.js', 'codegen.js', 'content.js', 'sidepanel.html', 'sidepanel.js'];

export function extensionFiles() {
  const files = TOP_LEVEL.map((name) => ({ name, data: readFileSync(join(EXTENSION_DIR, name)) }));
  const iconDir = join(EXTENSION_DIR, 'icons');
  for (const name of readdirSync(iconDir).sort()) {
    if (statSync(join(iconDir, name)).isFile()) {
      files.push({ name: `icons/${name}`, data: readFileSync(join(iconDir, name)) });
    }
  }
  return files;
}

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

// 2000-01-01 00:00:00 in DOS time and date.
const DOS_TIME = 0;
const DOS_DATE = ((2000 - 1980) << 9) | (1 << 5) | 1;

export function buildZip(files) {
  const locals = [];
  const central = [];
  let offset = 0;

  for (const { name, data } of files) {
    const nameBuf = Buffer.from(name, 'utf8');
    const packed = deflateRawSync(data, { level: 9 });
    const crc = crc32(data);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);        // version needed
    local.writeUInt16LE(0x0800, 6);    // flags: UTF-8 names
    local.writeUInt16LE(8, 8);         // method: deflate
    local.writeUInt16LE(DOS_TIME, 10);
    local.writeUInt16LE(DOS_DATE, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(packed.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28);
    locals.push(local, nameBuf, packed);

    const entry = Buffer.alloc(46);
    entry.writeUInt32LE(0x02014b50, 0);
    entry.writeUInt16LE(20, 4);        // version made by
    entry.writeUInt16LE(20, 6);        // version needed
    entry.writeUInt16LE(0x0800, 8);
    entry.writeUInt16LE(8, 10);
    entry.writeUInt16LE(DOS_TIME, 12);
    entry.writeUInt16LE(DOS_DATE, 14);
    entry.writeUInt32LE(crc, 16);
    entry.writeUInt32LE(packed.length, 20);
    entry.writeUInt32LE(data.length, 24);
    entry.writeUInt16LE(nameBuf.length, 28);
    entry.writeUInt32LE(offset, 42);
    central.push(entry, nameBuf);

    offset += local.length + nameBuf.length + packed.length;
  }

  const centralBuf = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralBuf.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, centralBuf, end]);
}

// Read a zip into [{ name, data }]. Handles deflate and stored entries, which is
// all the extension zip, old or new, contains.
export function readZip(buf) {
  let eocd = -1;
  for (let i = buf.length - 22; i >= 0; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('not a zip file');
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const out = [];
  for (let n = 0; n < count; n++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error('bad central directory');
    const method = buf.readUInt16LE(p + 10);
    const packedSize = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const localOffset = buf.readUInt32LE(p + 42);
    const name = buf.toString('utf8', p + 46, p + 46 + nameLen);
    const localNameLen = buf.readUInt16LE(localOffset + 26);
    const localExtraLen = buf.readUInt16LE(localOffset + 28);
    const start = localOffset + 30 + localNameLen + localExtraLen;
    const raw = buf.subarray(start, start + packedSize);
    out.push({ name, data: method === 0 ? Buffer.from(raw) : inflateRawSync(raw) });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return out;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const files = extensionFiles();
  writeFileSync(ZIP_PATH, buildZip(files));
  console.log(`wrote ${ZIP_PATH} (${files.length} files)`);
}
