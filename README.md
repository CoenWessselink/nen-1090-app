# CWS NEN-1090 Frontend

Deze levering bevat de bestaande frontend met broncode, productiebuild en een statische deploy-map.

## Belangrijkste correctie
De statische entrypoints verwijzen naar gebundelde assets in `./assets/...` en niet meer naar `src/main.tsx`. Daarmee wordt de fout voorkomen waarbij een statische host `main.tsx` als `application/octet-stream` teruggeeft en de browser een MIME type-fout toont.

## Installeren
```bash
npm ci
```

## Lokaal ontwikkelen
```bash
npm run dev
```

## Productiebouw
```bash
npm run build
```

## Statische deploy-bouw + verificatie
```bash
npm run build:static
```

## Deploy-bestanden
- `deploy-static/` → direct bruikbaar voor statische hosting
- `release/` → release-output
- root `index.html` + `assets/` → gebundelde root-output

## Verificatie
```bash
npm run verify:release
```
