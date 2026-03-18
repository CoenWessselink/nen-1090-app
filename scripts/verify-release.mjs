import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const htmlFiles = ['index.html', 'release/index.html', 'deploy-static/index.html'];
const failures = [];

for (const relativeFile of htmlFiles) {
  const filePath = path.join(root, relativeFile);
  if (!fs.existsSync(filePath)) {
    failures.push(`${relativeFile} ontbreekt.`);
    continue;
  }

  const html = fs.readFileSync(filePath, 'utf8');
  if (html.includes('/src/main.tsx') || html.includes('src/main.tsx')) {
    failures.push(`${relativeFile} verwijst nog naar src/main.tsx in plaats van gebundelde assets.`);
  }

  const assetMatches = [...html.matchAll(/(?:src|href)="\.\/assets\/([^"]+)"/g)].map((match) => match[1]);
  if (assetMatches.length === 0) {
    failures.push(`${relativeFile} bevat geen gebundelde asset-verwijzingen.`);
  }

  for (const assetName of assetMatches) {
    const assetPath = path.join(path.dirname(filePath), 'assets', assetName);
    if (!fs.existsSync(assetPath)) {
      failures.push(`${relativeFile} verwijst naar ontbrekende asset ${assetName}.`);
    }
  }
}

for (const supportFile of ['_headers', '_redirects', '404.html']) {
  const filePath = path.join(root, 'deploy-static', supportFile);
  if (!fs.existsSync(filePath)) {
    failures.push(`deploy-static/${supportFile} ontbreekt.`);
  }
}

if (failures.length > 0) {
  console.error('Release-verificatie mislukt:\n- ' + failures.join('\n- '));
  process.exit(1);
}

console.log('Release-verificatie geslaagd. Static deployment entrypoints verwijzen correct naar gebundelde assets.');
