PHASE 11 ERROR HUNTER SUITE

Doel:
- alle praktisch relevante browser-side fouten zichtbaar maken tijdens live flows

Toegevoegd:
- console-pageerror-catcher.spec.ts
- resource-request-failure-catcher.spec.ts
- all-critical-status-catcher.spec.ts
- weld-endpoint-error-catcher.spec.ts
- uncaught-promise-apierror-catcher.spec.ts
- route-by-route-error-matrix.spec.ts

Gedekte fouttypes:
- console.error / console.warn
- pageerror
- requestfailed
- resource load failures
- API 404/409/410/422/429/500/502/503/504
- weld-flow specifieke inspection / weld endpoint failures
- uncaught promise ApiError signalen
- route-matrix over dashboard, projecten, instellingen en projecttabs

Let op:
- "alle mogelijke errors" letterlijk kan nooit 100% absoluut zijn
- deze suite dekt wel de zwaarste en meest voorkomende browser/app/runtime/network/API-foutklassen
