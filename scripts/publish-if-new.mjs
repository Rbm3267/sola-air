// Publish the package in the current directory unless this exact version is
// already on the registry. Lets the release workflow be re-run safely, and lets
// it ship only the packages whose version actually changed, instead of dying on
// the first one that was published in an earlier release.
import { readFileSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';

// Run with --check to see what it would do without publishing anything.
const { name, version } = JSON.parse(readFileSync('package.json', 'utf8'));

const lookup = spawnSync('npm', ['view', `${name}@${version}`, 'version'], { encoding: 'utf8' });
if (lookup.status === 0 && lookup.stdout.trim() === version) {
  console.log(`skip ${name}@${version} — already published`);
  process.exit(0);
}
// Anything other than "version not found" (network, auth) must not be mistaken
// for "not published yet" and then fail confusingly inside publish.
if (lookup.status !== 0 && !/E404|404 Not Found|is not in this registry/i.test(lookup.stderr)) {
  console.error(lookup.stderr);
  process.exit(1);
}

if (process.argv.includes('--check')) {
  console.log(`would publish ${name}@${version} (--check: not publishing)`);
  process.exit(0);
}

console.log(`publish ${name}@${version}`);
execFileSync('npm', ['publish', '--provenance'], { stdio: 'inherit' });
