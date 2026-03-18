import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const distDir = path.join(root, 'dist');
const staticDir = path.join(root, 'deploy-static');

if (!fs.existsSync(distDir)) {
  throw new Error('dist map ontbreekt. Voer eerst npm run build uit.');
}

fs.rmSync(staticDir, { recursive: true, force: true });
fs.mkdirSync(staticDir, { recursive: true });

fs.cpSync(distDir, staticDir, { recursive: true });
for (const filename of ['_headers', '_redirects', '404.html']) {
  const source = path.join(root, filename);
  if (fs.existsSync(source)) {
    fs.copyFileSync(source, path.join(staticDir, filename));
  }
}

const note = `CWS NEN-1090 static deployment\n\nGebruik deze map voor statische hosting.\nDe root index.html verwijst naar gebundelde assets en voorkomt het direct laden van src/main.tsx op een statische host.`;
fs.writeFileSync(path.join(staticDir, 'DEPLOYMENT_README.txt'), note);
