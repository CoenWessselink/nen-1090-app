import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const srcEntry = path.join(root, 'src', 'main.tsx');
const publicEntry = path.join(root, 'index.html');

if (!fs.existsSync(srcEntry)) {
  console.error(`Missing source entry: ${srcEntry}`);
  process.exit(1);
}

if (!fs.existsSync(publicEntry)) {
  console.log('index.html not found, skipping source entry preparation.');
  process.exit(0);
}

console.log('use-source-entry.mjs: source entry check OK');
process.exit(0);
