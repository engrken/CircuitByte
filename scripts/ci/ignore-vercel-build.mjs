import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

// Vercel: exit 0 = skip this deployment, exit 1 = build. Unknown history MUST build.
export function mayIgnoreChange(path) {
  if (typeof path !== 'string' || !path || path.startsWith('/') || path.includes('..')) return false;
  return path === 'README.md' || path === 'CHANGELOG.md' ||
    /^docs\/.+\.md$/i.test(path) ||
    /^services\/copilot\/.+/.test(path) ||
    /^\.circleci\/.+/.test(path) ||
    /^\.github\/ISSUE_TEMPLATE\/.+/.test(path);
}
export function maySkipBuild(paths) {
  return Array.isArray(paths) && paths.length > 0 && paths.every(mayIgnoreChange);
}
export function changedFilesFromHead() {
  const parents = spawnSync('git', ['rev-list', '--parents', '-n', '1', 'HEAD'], {encoding:'utf8'});
  if (parents.status !== 0 || !parents.stdout) return null;
  const shaList = parents.stdout.trim().split(/\s+/);
  if (shaList.length !== 2) return null; // root or merge: fail open
  const diff = spawnSync('git', ['diff', '--name-only', '-z', shaList[1], shaList[0]], {encoding:'utf8'});
  if (diff.status !== 0) return null;
  return diff.stdout.split('\0').filter(Boolean);
}
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const paths = changedFilesFromHead();
  if (maySkipBuild(paths)) {
    console.log('CircuitByte: documentation/CI/retired service only; skip this Vercel deployment.');
    process.exit(0);
  }
  console.log('CircuitByte: application change or unknown history; build for safety.');
  process.exit(1);
}
