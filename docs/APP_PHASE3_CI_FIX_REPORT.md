# App fase 3 CI-fix

Deze fix herstelt de rode app-build na fase 3.

## Root cause

De workflows falen op TypeScript-build fouten:

- `@/api/documents` exporteerde niet alle functies die bestaande hooks en mobiele pagina's importeren.
- `WeldInspectionDetailPage.tsx` kreeg een `unknown` resultaat uit `getWeld(...)` en gaf dit direct door aan `setWeld(...)`.

## Aangepaste bestanden

- `src/api/documents.ts`
- `src/features/welds/WeldInspectionDetailPage.tsx`

## Verwacht resultaat

- `npm run build` compileert weer voorbij deze errors.
- Cloudflare Pages deploy kan door naar de volgende stap.
- Bestaande document-, mobiele en lasinspectie-imports blijven compatibel.
