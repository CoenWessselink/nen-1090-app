import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const required = [
  path.join(root, 'src', 'main.tsx'),
  path.join(root, 'src', 'app', 'router', 'routes.tsx'),
  path.join(root, 'index.html'),
];

const missing = required.filter((file) => !fs.existsSync(file));

if (missing.length) {
  console.error('use-source-entry.mjs: missing required source files:');
  missing.forEach((file) => console.error(`- ${file}`));
  process.exit(1);
}

console.log('use-source-entry.mjs: source entry check OK');
