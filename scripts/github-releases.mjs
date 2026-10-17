// Create a GitHub Release for each published package whose current version has a
// CHANGELOG entry and no release yet. Tags are <package>-v<version>, for example
// core-v1.5.0, because this repo ships several packages with separate versions.
//
//   node scripts/github-releases.mjs --check    print what would be created, touch nothing
//   node scripts/github-releases.mjs            create them (needs GITHUB_TOKEN, GITHUB_REPOSITORY)
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// The notes for name@version: the "### `name`" part of the dated section whose
// heading mentions "<short> <version>", or the "### `name@version`" part of any section.
export function releaseNotes(changelog, name, version) {
  const short = name.includes('/') ? name.split('/')[1] : name;
  const lines = changelog.split('\n');
  const take = (from) => {
    const level = lines[from].match(/^#+/)[0].length;
    const out = [];
    for (let i = from + 1; i < lines.length; i++) {
      const m = lines[i].match(/^(#+) /);
      if (m && m[1].length <= level) break;
      out.push(lines[i]);
    }
    return out.join('\n').trim();
  };
  const versioned = new RegExp('^### `' + escapeRe(name) + '@' + escapeRe(version) + '`\\s*$');
  const mention = new RegExp('(^|[\\s,:(])' + escapeRe(short) + ' ' + escapeRe(version) + '([\\s,)]|$)');
  const own = new RegExp('^### `' + escapeRe(name) + '`\\s*$');
  for (let i = 0; i < lines.length; i++) {
    if (versioned.test(lines[i])) return take(i) || null;
    if (/^## /.test(lines[i]) && mention.test(lines[i])) {
      for (let j = i + 1; j < lines.length && !/^## /.test(lines[j]); j++) {
        if (own.test(lines[j])) return take(j) || null;
      }
    }
  }
  return null;
}

export function publishedPackages(dir = join(root, 'packages')) {
  return readdirSync(dir)
    .map((d) => join(dir, d, 'package.json'))
    .filter((p) => existsSync(p))
    .map((p) => JSON.parse(readFileSync(p, 'utf8')))
    .filter((p) => p.name && p.version && !p.private && p.name !== 'sola-vscode');
}

export const tagFor = (name, version) =>
  `${name.includes('/') ? name.split('/')[1] : name}-v${version}`;

async function main() {
  const check = process.argv.includes('--check');
  const changelog = readFileSync(join(root, 'CHANGELOG.md'), 'utf8');
  const { GITHUB_TOKEN, GITHUB_REPOSITORY, GITHUB_SHA } = process.env;
  if (!check && !(GITHUB_TOKEN && GITHUB_REPOSITORY)) {
    throw new Error('GITHUB_TOKEN and GITHUB_REPOSITORY are required (or pass --check)');
  }
  const api = (path, init = {}) =>
    fetch(`https://api.github.com/repos/${GITHUB_REPOSITORY}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json'
      }
    });

  for (const { name, version } of publishedPackages()) {
    const tag = tagFor(name, version);
    const notes = releaseNotes(changelog, name, version);
    if (!notes) { console.log(`skip ${tag} (no CHANGELOG entry)`); continue; }
    if (check) { console.log(`would create ${tag}\n${notes.split('\n').slice(0, 3).join('\n')}\n`); continue; }

    const existing = await api(`/releases/tags/${tag}`);
    if (existing.ok) { console.log(`skip ${tag} (release exists)`); continue; }
    if (existing.status !== 404) throw new Error(`lookup ${tag}: ${existing.status}`);

    const res = await api('/releases', {
      method: 'POST',
      body: JSON.stringify({
        tag_name: tag,
        target_commitish: GITHUB_SHA,
        name: `${name} ${version}`,
        body: `${notes}\n\nnpm: https://www.npmjs.com/package/${name}/v/${version}`,
        // Several packages release separately, so none of them is "the" latest release.
        make_latest: 'false'
      })
    });
    if (!res.ok) throw new Error(`create ${tag}: ${res.status} ${await res.text()}`);
    console.log(`created ${tag}`);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((err) => { console.error(err.message); process.exit(1); });
}
