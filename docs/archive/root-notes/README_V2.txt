NEN1090 ENTERPRISE TEST SUITE V2

DOEL
- Windows-vriendelijke API testsetup zonder orjson / Rust-blockers
- Projectcentrische Playwright suite voor de huidige app-flow

APP BESTANDEN PLAATSEN
- tests/e2e/helpers.ts                  -> C:\NEN1090\nen-1090-app\tests\e2e\helpers.ts
- tests/e2e/project-flow.spec.ts        -> C:\NEN1090\nen-1090-app\tests\e2e\project-flow.spec.ts
- tests/e2e/assemblies-flow.spec.ts     -> C:\NEN1090\nen-1090-app\tests\e2e\assemblies-flow.spec.ts
- tests/e2e/welds-ce-flow.spec.ts       -> C:\NEN1090\nen-1090-app\tests\e2e\welds-ce-flow.spec.ts
- playwright.config.ts                  -> C:\NEN1090\nen-1090-app\playwright.config.ts
- package.json.partial                  -> lees de scripts over naar package.json

API BESTANDEN PLAATSEN
- api-root/tests/*                      -> C:\NEN1090\NEN10900-api\tests\
- api-root/pytest.ini                   -> C:\NEN1090\NEN10900-api\pytest.ini
- api-root/requirements.txt             -> merge handmatig in je bestaande requirements.txt of gebruik alleen voor tests

AANRADER VOOR API
Voeg in je echte requirements.txt minimaal toe:
- requests>=2.31.0
- pytest>=8.3.0
Laat orjson buiten je testsetup als Windows zonder Rust draait.

APP COMMANDO'S
cd C:\NEN1090\nen-1090-app
npm ci
npx playwright install chromium
npm run build
npx playwright test --project=desktop-chromium
npx playwright show-report

API COMMANDO'S
cd C:\NEN1090\NEN10900-api
python -m venv .venv
& .\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
pytest

POWERSHELL RUNNERS
- scripts/test-app-local.ps1
- scripts/test-api-local.ps1
