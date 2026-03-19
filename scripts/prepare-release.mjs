import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const distDir = join(root, 'dist');
const releaseDir = join(root, 'release');

if (!existsSync(distDir)) {
  throw new Error('dist directory not found. Run npm run build first.');
}

rmSync(releaseDir, { recursive: true, force: true });
mkdirSync(releaseDir, { recursive: true });
cpSync(distDir, releaseDir, { recursive: true });

const spaFallback = readFileSync(join(distDir, 'index.html'), 'utf8');
writeFileSync(join(releaseDir, '_redirects'), '/* /index.html 200\n');
writeFileSync(
  join(releaseDir, '_headers'),
  ['/assets/*', '  Cache-Control: public, max-age=31536000, immutable', '', '/*.html', '  Cache-Control: no-cache', ''].join('\n'),
);
writeFileSync(join(releaseDir, '404.html'), spaFallback);
