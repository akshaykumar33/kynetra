// Fails when the JavaScript the page loads up front grows past the budget.
// "Up front" means the entry script plus every modulepreload in dist/index.html.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const BUDGET_KB = 350;
const dist = 'apps/web/dist';
const html = readFileSync(join(dist, 'index.html'), 'utf8');
const files = [...html.matchAll(/(?:src|href)="\/(assets\/[^"]+\.js)"/g)].map(m => m[1]);

if (files.length === 0) {
  console.error('No scripts found in apps/web/dist/index.html. Run `npm run build` first.');
  process.exit(1);
}

let total = 0;
for (const f of new Set(files)) {
  const kb = gzipSync(readFileSync(join(dist, f))).length / 1024;
  total += kb;
  console.log(`${kb.toFixed(1).padStart(8)} KB  ${f}`);
}
console.log(`${total.toFixed(1).padStart(8)} KB  total initial JS (gzip), budget ${BUDGET_KB} KB`);
if (total > BUDGET_KB) {
  console.error(`Over budget by ${(total - BUDGET_KB).toFixed(1)} KB.`);
  process.exit(1);
}
