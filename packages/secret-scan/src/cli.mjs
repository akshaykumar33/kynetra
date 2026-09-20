#!/usr/bin/env node
/**
 * Kynetra secret scanner CLI.
 *
 * Modes:
 *   --staged   scan content as staged in the git index (pre-commit hook)
 *   --all      scan every tracked file (CI, and manual audits)
 *   --files … scan explicit paths
 *
 * Exits 1 on any finding. See `prompts/starter_prompt.md` §17.3–17.6.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { isBinary, scanContent, scanPath, scanSize } from './patterns.mjs';

const RESET = '\u001b[0m';
const RED = '\u001b[31m';
const YELLOW = '\u001b[33m';
const DIM = '\u001b[2m';

/**
 * @param {string[]} args
 * @returns {string}
 */
function git(args) {
  return execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
}

/** Paths staged for commit, excluding deletions. */
function stagedFiles() {
  return git(['diff', '--cached', '--name-only', '--diff-filter=ACMR'])
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
}

function trackedFiles() {
  return git(['ls-files'])
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
}

/**
 * Read the staged version of a file rather than the working tree, so the hook
 * scans exactly what is about to be committed. A developer who stages a secret
 * and then edits it out of the working tree must still be caught.
 * @param {string} file
 * @returns {Buffer | null}
 */
function readStaged(file) {
  try {
    return execFileSync('git', ['show', `:${file}`], { maxBuffer: 64 * 1024 * 1024 });
  } catch {
    return null;
  }
}

/**
 * @param {string} file
 * @returns {Buffer | null}
 */
function readWorking(file) {
  if (!existsSync(file)) return null;
  try {
    return readFileSync(file);
  } catch {
    return null;
  }
}

/** Files Git LFS is tracking; these are pointers, not payloads. */
function lfsTrackedPaths() {
  try {
    const out = execFileSync('git', ['lfs', 'ls-files', '--name-only'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    return new Set(
      out
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean),
    );
  } catch {
    return new Set();
  }
}

function main() {
  const argv = process.argv.slice(2);
  const staged = argv.includes('--staged');
  const all = argv.includes('--all');
  const explicitIndex = argv.indexOf('--files');
  const explicit =
    explicitIndex >= 0 ? argv.slice(explicitIndex + 1).filter((a) => !a.startsWith('--')) : [];

  let files;
  if (explicit.length > 0) files = explicit;
  else if (staged) files = stagedFiles();
  else if (all) files = trackedFiles();
  else {
    console.error('Usage: secret-scan [--staged | --all | --files <path...>]');
    process.exit(2);
  }

  if (files.length === 0) {
    console.log(`${DIM}secret-scan: nothing to scan${RESET}`);
    return;
  }

  const lfs = lfsTrackedPaths();
  /** @type {import('./patterns.mjs').Finding[]} */
  const findings = [];

  for (const file of files) {
    const posix = file.split('\\').join('/');
    findings.push(...scanPath(posix));

    const buffer = staged ? readStaged(file) : readWorking(file);
    if (!buffer) continue;

    if (!lfs.has(posix)) {
      findings.push(...scanSize(posix, buffer.length));
    }

    if (isBinary(buffer)) continue;
    // Beyond this size a text file is generated output, not hand-written source.
    if (buffer.length > 2 * 1024 * 1024) continue;

    findings.push(...scanContent(posix, buffer.toString('utf8')));
  }

  if (findings.length === 0) {
    console.log(`${DIM}secret-scan: ${files.length} file(s) clean${RESET}`);
    return;
  }

  console.error(`\n${RED}✖ secret-scan blocked ${findings.length} finding(s)${RESET}\n`);
  for (const f of findings) {
    const where = f.line > 0 ? `${f.file}:${f.line}` : f.file;
    console.error(`  ${YELLOW}${where}${RESET}  [${f.rule}]`);
    console.error(`    ${f.reason}`);
    if (f.excerpt) console.error(`    ${DIM}match: ${f.excerpt}${RESET}`);
    console.error('');
  }
  console.error(`${RED}Commit rejected.${RESET}`);
  console.error('');
  console.error('If a credential was real and has ever been written to disk here,');
  console.error('ROTATE IT FIRST, then remove it. See prompts/starter_prompt.md §17.6.');
  console.error('');
  console.error('If this is a false positive, append the marker `kynetra-allow-secret`');
  console.error('to the offending line, and say why in the pull request.');
  process.exit(1);
}

main();
