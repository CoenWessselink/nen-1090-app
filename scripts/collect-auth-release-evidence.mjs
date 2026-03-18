import fs from 'node:fs';
import path from 'node:path';

const cwd = process.cwd();
const evidenceDir = path.resolve(cwd, 'auth-release-evidence');
const matrixPath = path.join(evidenceDir, 'live-auth-matrix.json');
const markdownPath = path.join(evidenceDir, 'AUTH_RELEASE_EVIDENCE.md');

fs.mkdirSync(evidenceDir, { recursive: true });

let matrix = null;
if (fs.existsSync(matrixPath)) {
  matrix = JSON.parse(fs.readFileSync(matrixPath, 'utf8'));
}

const lines = [];
lines.push('# AUTH release evidence');
lines.push('');
lines.push(`Generated: ${new Date().toISOString()}`);
lines.push('');
lines.push('## Scope');
lines.push('- API AUTH');
lines.push('- APP AUTH');
lines.push('- E2E AUTH');
lines.push('');
lines.push('## Build artifacts checked');
lines.push(`- package.json scripts present: ${fs.existsSync(path.join(cwd, 'package.json')) ? 'yes' : 'no'}`);
lines.push(`- Playwright live spec present: ${fs.existsSync(path.join(cwd, 'tests/e2e/auth-live.spec.ts')) ? 'yes' : 'no'}`);
lines.push(`- Live auth runbook present: ${fs.existsSync(path.join(cwd, 'docs/AUTH_BLOCK_C_RELEASE_RUNBOOK.md')) ? 'yes' : 'no'}`);
lines.push('');
lines.push('## Live matrix summary');
if (!matrix) {
  lines.push('- No live-auth-matrix.json found yet. Run `npm run auth:matrix:live` first.');
} else {
  lines.push(`- Overall status: ${matrix.overall_status}`);
  lines.push(`- Base URL: ${matrix.base_url}`);
  lines.push(`- Generated at: ${matrix.generated_at}`);
  lines.push('');
  lines.push('| Step | Status | HTTP |');
  lines.push('|---|---|---|');
  for (const step of matrix.steps) {
    lines.push(`| ${step.label} | ${step.status} | ${step.http_status ?? ''} |`);
  }
}
lines.push('');
lines.push('## Final manual release checks');
lines.push('- Verify reset mail delivery or documented reset-token source.');
lines.push('- Verify audit log rows in database for login, refresh denial, logout, reset request, reset confirm, change password.');
lines.push('- Verify Alembic migration 0019 applied in target environment.');
lines.push('- Verify no .env file is committed and only .env.example remains.');
lines.push('');
lines.push('## Decision');
lines.push('- Set AUTH to 100% FINAL only when all live matrix steps are green and manual release checks are signed off.');
lines.push('');

fs.writeFileSync(markdownPath, `${lines.join('\n')}\n`, 'utf8');
console.log(`Auth release evidence written to ${markdownPath}`);
