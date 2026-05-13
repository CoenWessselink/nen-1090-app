/**
 * Fail CI if any single emitted JS chunk exceeds the budget (post-split).
 * Run after `vite build` (expects ./dist/assets/*.js).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const assetsDir = path.join(root, 'dist', 'assets');

/** Uncompressed max per .js chunk (bytes). Tune only with team agreement. */
const MAX_CHUNK_BYTES = Number(process.env.BUNDLE_MAX_CHUNK_BYTES || 620_000);

function main() {
  if (!fs.existsSync(assetsDir)) {
    console.error(`check-bundle-budget: missing ${assetsDir} — run vite build first.`);
    process.exit(1);
  }

  const files = fs.readdirSync(assetsDir).filter((f) => f.endsWith('.js'));
  if (files.length === 0) {
    console.error('check-bundle-budget: no .js files in dist/assets.');
    process.exit(1);
  }

  let worst = { name: '', size: 0 };
  for (const name of files) {
    const size = fs.statSync(path.join(assetsDir, name)).size;
    if (size > worst.size) worst = { name, size };
  }

  if (worst.size > MAX_CHUNK_BYTES) {
    console.error(
      `Bundle budget exceeded: ${worst.name} is ${worst.size} bytes (max ${MAX_CHUNK_BYTES}). ` +
        'Add route-level lazy loading or split heavy features.',
    );
    process.exit(1);
  }

  console.log(`check-bundle-budget: OK — largest chunk ${worst.name} = ${worst.size} bytes (max ${MAX_CHUNK_BYTES}).`);
}

main();
