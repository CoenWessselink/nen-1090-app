import { cpSync, existsSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const distDir = join(root, 'dist');
const releaseDir = join(root, 'release');
const rootAssetsDir = join(root, 'assets');

if (!existsSync(distDir)) {
  throw new Error('dist directory not found. Run npm run build first.');
}

rmSync(rootAssetsDir, { recursive: true, force: true });
cpSync(join(distDir, 'assets'), rootAssetsDir, { recursive: true });
cpSync(join(distDir, 'index.html'), join(root, 'index.html'));
if (existsSync(join(distDir, '404.html'))) {
  cpSync(join(distDir, '404.html'), join(root, '404.html'));
}

for (const fileName of ['_redirects', '_headers']) {
  const filePath = join(releaseDir, fileName);
  if (existsSync(filePath)) cpSync(filePath, join(root, fileName));
}

if (existsSync(releaseDir)) {
  for (const entry of readdirSync(releaseDir)) {
    if (entry === 'assets' || entry === 'index.html') continue;
    cpSync(join(releaseDir, entry), join(root, entry), { recursive: true, force: true });
  }
}
