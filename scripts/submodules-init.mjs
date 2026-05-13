/**
 * Optional: run `git submodule update --init` when .gitmodules exists.
 * This app does not ship a backend submodule (Cloudflare Pages cannot clone private submodules reliably).
 * Frontend bundle does not import ../backend.
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
