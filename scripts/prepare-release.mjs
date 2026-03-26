import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const distDir = path.join(root, 'dist');

if (!fs.existsSync(distDir)) {
  console.error(`Missing dist directory: ${distDir}`);
  process.exit(1);
}

console.log('prepare-release.mjs: dist directory found, release preparation OK');
process.exit(0);
