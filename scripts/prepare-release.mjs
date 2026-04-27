import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const distDir = path.join(root, 'dist');
const releaseDir = path.join(root, 'release');
const redirectsFile = path.join(root, 'public', '_redirects');
const headersFile = path.join(root, '_headers');
const publicAppDir = path.join(root, 'public', 'app');
const functionsDir = path.join(root, 'functions', 'api', 'v1');

function assertExists(target, label) {
  if (!fs.existsSync(target)) {
    console.error(`prepare-release.mjs: missing ${label}: ${target}`);
    process.exit(1);
  }
}

function rmrf(target) {
  fs.rmSync(target, { recursive: true, force: true });
}

function mkdir(target) {
  fs.mkdirSync(target, { recursive: true });
}

function copyDir(source, target) {
  mkdir(target);
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const sourcePath = path.join(source, entry.name);
    const targetPath = path.join(target, entry.name);
    if (entry.isDirectory()) {
      copyDir(sourcePath, targetPath);
      continue;
    }
    fs.copyFileSync(sourcePath, targetPath);
  }
}

assertExists(distDir, 'dist directory');
assertExists(redirectsFile, 'public/_redirects');
assertExists(publicAppDir, 'public/app compatibility directory');

if (!fs.existsSync(functionsDir)) {
  console.warn(`prepare-release.mjs: optional functions directory not found: ${functionsDir}`);
}

const distFiles = fs.readdirSync(distDir);
if (!distFiles.length) {
  console.error('prepare-release.mjs: dist directory is empty');
  process.exit(1);
}

rmrf(releaseDir);
copyDir(distDir, releaseDir);
fs.copyFileSync(redirectsFile, path.join(releaseDir, '_redirects'));
if (fs.existsSync(headersFile)) {
  fs.copyFileSync(headersFile, path.join(releaseDir, '_headers'));
}
copyDir(publicAppDir, path.join(releaseDir, 'app'));

console.log('prepare-release.mjs: release preparation OK');
