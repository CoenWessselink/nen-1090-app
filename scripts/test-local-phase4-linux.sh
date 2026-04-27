#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

export PLAYWRIGHT_BASE_URL="${PLAYWRIGHT_BASE_URL:-http://127.0.0.1:4173}"
export PLAYWRIGHT_EXECUTABLE_PATH="${PLAYWRIGHT_EXECUTABLE_PATH:-/usr/bin/chromium}"
export PLAYWRIGHT_RESTRICTED_BROWSER="${PLAYWRIGHT_RESTRICTED_BROWSER:-1}"

npm run typecheck
npm run build
./node_modules/.bin/playwright test --list

echo "Start lokale previewserver op ${PLAYWRIGHT_BASE_URL} in een tweede terminal voordat je volledige E2E draait."
./node_modules/.bin/playwright test tests/e2e/auth-routing-smoke.spec.ts --project=desktop-chromium
