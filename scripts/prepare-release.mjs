import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const distDir = path.join(root, 'dist');
const redirectsFile = path.join(root, 'public', '_redirects');
const functionsDir = path.join(root, 'functions', 'api', 'v1');
const legacyLoginFile = path.join(root, 'public', 'app', 'login.html');

function assertExists(target, label) {
  if (!fs.existsSync(target)) {
    console.error(`prepare-release.mjs: missing ${label}: ${target}`);
    process.exit(1);
  }
}

assertExists(distDir, 'dist directory');
assertExists(redirectsFile, '_redirects');
assertExists(legacyLoginFile, 'legacy login compatibility file');

if (!fs.existsSync(functionsDir)) {
  console.warn(`prepare-release.mjs: optional functions directory not found: ${functionsDir}`);
}

const distFiles = fs.readdirSync(distDir);
if (!distFiles.length) {
  console.error('prepare-release.mjs: dist directory is empty');
  process.exit(1);
}

console.log('prepare-release.mjs: release preparation OK');
