// Starts the pinned livekit-server in dev mode (keys devkey / secret) on 127.0.0.1:7880.
// Used by `npm run dev:voice` and the e2e suite.
import { execFileSync, spawn } from 'node:child_process';

const bin = process.env.LIVEKIT_BIN ?? execFileSync(process.execPath, ['scripts/get-livekit.mjs']).toString().trim();
const child = spawn(bin, ['--dev', '--bind', '127.0.0.1'], { stdio: 'inherit' });
const stop = () => child.kill();
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
child.on('exit', code => process.exit(code ?? 0));
