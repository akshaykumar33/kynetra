// Downloads the pinned livekit-server release for this platform into .tools/livekit and verifies its
// SHA-256 before extracting. Used by local development, the e2e suite and CI.
//   node scripts/get-livekit.mjs        -> prints the binary path
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const VERSION = '1.13.9';
// from https://github.com/livekit/livekit/releases/download/v1.13.9/checksums.txt
const BUILDS = {
  'win32-x64': {
    file: `livekit_${VERSION}_windows_amd64.zip`,
    sha256: 'd5b5e44c197f613fdd6bdb2ae53e9d086d848156d43f614c688c6b595cd3f25e',
    bin: 'livekit-server.exe',
  },
  'linux-x64': {
    file: `livekit_${VERSION}_linux_amd64.tar.gz`,
    sha256: '0b7fa208b662d09cfdeae8c06cf4c481aead0556086558b48250501e2e2d6e20',
    bin: 'livekit-server',
  },
};

const build = BUILDS[`${process.platform}-${process.arch}`];
if (!build) {
  console.error(
    `No pinned livekit-server build for ${process.platform}-${process.arch}. Install it yourself and set LIVEKIT_BIN.`,
  );
  process.exit(1);
}

const dir = resolve('.tools/livekit', VERSION);
const bin = join(dir, build.bin);
if (!existsSync(bin)) {
  mkdirSync(dir, { recursive: true });
  const url = `https://github.com/livekit/livekit/releases/download/v${VERSION}/${build.file}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed: ${res.status} ${url}`);
  const data = Buffer.from(await res.arrayBuffer());
  const actual = createHash('sha256').update(data).digest('hex');
  if (actual !== build.sha256) throw new Error(`Checksum mismatch for ${build.file}: got ${actual}`);
  const archive = join(dir, build.file);
  writeFileSync(archive, data);
  // bsdtar ships with Windows 10+ (and reads zip); GNU tar is on every Linux CI image. Run inside the
  // folder with a relative name: GNU tar would read a drive letter like D: as a remote host.
  const tar =
    process.platform === 'win32' ? join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'tar.exe') : 'tar';
  execFileSync(tar, ['-xf', build.file], { cwd: dir });
  if (!existsSync(bin)) throw new Error(`Extracted archive has no ${build.bin}`);
  if (process.platform !== 'win32') execFileSync('chmod', ['+x', bin]);
  readFileSync(bin); // make sure it is readable
}
console.log(bin);
