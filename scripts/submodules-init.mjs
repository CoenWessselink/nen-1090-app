/**
 * Cloudflare Pages / CI: ensure git submodules are checked out when .git is present.
 * Frontend build does not import backend; failing submodule fetch must not break the Pages build.
 */
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';

if (!existsSync('.git') || !existsSync('.gitmodules')) {
  process.exit(0);
}

try {
  execSync('git submodule update --init --recursive', {
    stdio: 'inherit',
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
  });
} catch (err) {
  console.warn(
    '[submodules-init] Submodule checkout failed; continuing (frontend bundle does not require backend):',
    err?.message || err,
  );
}
