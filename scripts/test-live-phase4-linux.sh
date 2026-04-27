#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

export PLAYWRIGHT_BASE_URL="${PLAYWRIGHT_BASE_URL:-https://nen-1090-app.pages.dev}"
export PLAYWRIGHT_EXECUTABLE_PATH="${PLAYWRIGHT_EXECUTABLE_PATH:-/usr/bin/chromium}"
export PLAYWRIGHT_RESTRICTED_BROWSER="${PLAYWRIGHT_RESTRICTED_BROWSER:-1}"

npm run build
./node_modules/.bin/playwright test --list
./node_modules/.bin/playwright test tests/e2e/auth-routing-smoke.spec.ts --project=desktop-chromium
