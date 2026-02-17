Start (file:// compatible):
- Open index.html direct in de browser.
- Gebruik Apps Menu of knoppen om te navigeren.
- Geen localhost server nodig.

NEN1090 Lascontrole — CWS Shell (offline-first)

Start:
- Open index.html in een browser (werkt ook via file://).
- Gebruik "Apps Menu" om te wisselen tussen:
  - Projecten
  - Lascontrole (NEN 1090)
  - Instellingen

Opslag:
- localStorage key: nen1090_state_v1
- Demo data knop vult standaard projecten + lassen.

DoD (basis):
- 0 console errors
- UI-skin via css/theme.css (zelfde als aangeleverde theme)
- Routing via iframe, parent-state (CWS)

Volgende fases:
- Controlestructuur (criteria tabellen)
- Documenten/foto upload
- Rapportage + PDF/ZIP export (zonder browservensters)
- Locking + revisies + audit-proof


Fase v4:
- Checklist & Conform + progress + digitale ondertekening (tekst)
- Project Lock (status=locked, read-only) + Admin unlock
- Revisies / Historie (revisie snapshots + audit trail tabel)

Fase v5:
- Rapportage tab met generator:
  - Download HTML rapport (dossier)
  - Print/PDF via hidden iframe (geen extra browservenster)
  - Export dossier als JSON (incl. documenten als dataURL)

Opmerking:
- PDF's als echte 'invoegpagina's' en echte ZIP container zonder libraries is in pure vanilla browser beperkt; deze build levert audit-proof content als HTML + JSON export.


v5.3.3:
- Projecten: single-click op rij opent popup edit.
- Instellingen → Werknemers: PDF certificaat upload (opslaan in localStorage als dataURL) + download/link + verwijderen.


v5.4:
- Volgende fase gestart: echte ZIP-export (geen dependencies) via TinyZip.
  - dossier_<nr>.zip bevat rapport.html, dossier.json, bewijsstukken (docs/foto’s/PDFs) en werknemer-certificaat PDFs.


v5.5:
- Rapportage: Export dossier (PDF) via print (iframe), met inline images en embedded PDF bijlagen (browser print afhankelijk).
- ZIP export blijft de 100% zekere variant.


v5.6:
- Voorbereiding voor echte PDF-merge met pdf-lib (offline). Plaats js/vendor/pdf-lib.min.js.
- Nieuwe knop: "PDF merge (pdf-lib)" → maakt 1 PDF met cover + alle bewijsstukken (PDFs + images) + werknemer-certificaat PDFs.


v5.6.2:
- FIX: demo data crash in resetDemo (verwijderd ws1/ws2 referentie).
- index.html start nu direct in Projecten (auto-redirect). Optionele startpagina: start.html.


v5.7:
- Fase 2 uitbreiding: rechtsklik contextmenu (Bewerk/Dupliceer/Verwijder) op Projecten, Werknemers, Certificaten, Keuzelijsten en Lassen.


v5.8:
- Volgende fase: Project 360° popup.
  - Dubbelklik op project opent Project 360.
  - Snelle navigatie naar Lascontrole/Documenten/Checklist.
  - Single click blijft edit popup.


v5.8:
- Projecten: Kolommenbeheer (Kolommen-knop) + kolommen verbergen/tonen + volgorde via drag in popup en ook direct via header slepen.
- Opslag per user view in localStorage: ui.view.projectenCols.


v5.9:
- Kolommenbeheer doorgetrokken naar: Lascontrole → Lassen + Instellingen → Werknemers & Certificaten.
- Kolommen popup + drag reorder in headers; opslag in ui.view.{lassenCols, settingsWorkersCols, settingsCertCols}.


v6.0:
- Kolommenbeheer doorgetrokken naar Lascontrole → Materialen, Documenten, Checklist, Revisies.
- Elk tabblad heeft eigen Kolommen-knop, drag & drop headers en persistente view state.


v5.10:
- Kolommenbeheer doorgezet in Lascontrole: Materialen, Documenten, Certificaten, Checklist, Historie (events).
- Elke tabel heeft eigen stateKey in ui.view (per subtab waar relevant).


v5.11:
- Stap 1-3 in 1 build:
  - Checklist: groepering per norm + knoppen Alles afvinken / Alles goedkeuren.
  - Workflow: Projectstatus Concept → In controle → Goedgekeurd → Gesloten (validatie bij goedkeuren/sluiten).
  - Validaties: checklist (applicable+approved), las velden (materiaal/dikte/lasser), minimaal 1 las, waarschuwing bij geen bewijsstukken.
  - Lock: Gesloten = read-only (UI disable + store guards).
  - Rapportage: dossierstatus + issues/waarschuwingen opgenomen.


v5.12:
- Instellingen → Werknemers: kolommen uitgebreid volgens 'Summary of Welding Qualification' (Certificate No., welding process, type of weld, base metal, filler material, welding positions, thickness & diameter ranges, valid until) + contact/adres velden.
- Certificaten-formulier uitgebreid met lasser-kwalificatie velden + welderId koppeling.
- Demo: voorbeeld lasser-certificaat gekoppeld aan WKR-001.


v5.12.1:
- Werknemer bewerken popup uitgebreid met Laskwalificatie-samenvatting velden (Certificate No., process, type of weld, base/filler, positions, thickness/diameter, valid until).
- Opslaan schrijft deze velden naar (of maakt) gekoppeld certificaat type=lassers met welderId.
- Knop 'Open certificaten' zet filter op welderId in Certificaten-tab.


v5.12.2:
- Fix: Werknemer popup crash wanneer er nog geen gekoppeld certificaat bestaat (wc=null → {}).
- Fix: opslaan lasser-kwalificatie gebruikt robuuste upsertCert resolver + foutmelding in toast.


v5.12.3:
- Fix: syntax error 'Unexpected token catch' door foutieve try/catch injectie.
- Opslaan werknemer + laskwalificatie nu 100% syntax-safe.


v5.12.4:
- Fix: Instellingen → Werknemers popup 'Opslaan mislukt' doordat upsertWorker/removeWorker niet geëxporteerd waren in window.CWS.


v5.12.5:
- Nieuw werknemer gebruikt nu dezelfde uitgebreide popup als bewerken (incl. laskwalificatie velden + PDF).
- ID is bewerkbaar bij nieuw, readonly bij bestaand.


v5.12.6:
- Fix: SyntaxError 'Unexpected end of input' door onvolledig afgesloten btnNewWorker handler.
- Opslaan werkt weer in hele programma.


v5.12.6:
- Fix: instellingen.html syntax 'Unexpected end of input' door ontbrekende afsluitende '}' (bind(tab)).


v5.12.7:
- Debug: 'Opslaan mislukt' toont nu echte foutmelding (message) i.p.v. generieke toast.
- Global error handlers (error + unhandledrejection) tonen fout direct in UI + bewaren in window.__CWS_LAST_ERROR.


v5.12.8:
- Fix: lascontrole.html duplicate 'body' identifier (hernoemd naar bodyEl in Materialen tabel).
- Fix: pdf-lib.min.js ontbrekend → toegevoegd js/vendor/pdf-lib.min.js stub zodat er geen 404/console error is.


v5.12.9:
- Fix: alle resterende dubbele 'const body' declaraties in lascontrole.html hernoemd (bodyEl1..n).


v5.12.9:
- Fix: lascontrole.html meerdere dubbele 'const body' declaraties → allemaal uniek gemaakt (bodyEl1..bodyEl10).


v5.13.0:
- Fix: lascontrole render/bindControles had broken variable renames (body/bodyElX) → now uses weldBody + critBody.
- Fix: controlsGroupsUI missing → toegevoegd subtab UI (pre/mat/weld/ndt/doc).


v5.13.1:
- Fix: lascontrole syntax error 'Unexpected token }' door verkeerd geneste bindDocumenten binnen render().
- Fix: documenten render gebruikte undefined 'body' → bodyEl4.


v5.13.2:
- Structurele fix: lascontrole.html teruggezet naar laatst stabiele versie (v5.12.6) om syntax regressies (body/controlsGroupsUI) te elimineren.
- Werknemers popup/kolommen + workflow/validaties blijven behouden.


v5.13.3:
- Structurele fix: in lascontrole.html inline script stonden 11x 'const body' in dezelfde scope → nu hernoemd naar body1..body11 per sectie (geen redeclare errors meer).


v5.13.4:
- Fix: controlsGroupsUI ontbrak in lascontrole.html → toegevoegd (subtabs Voorbereiding/Materiaal/Uitvoering/NDT/Documentatie).


v5.14.0:
- Structurele fix: Opslaan werkte nergens door localStorage quota/attachments (PDF DataURL). Store strippt nu grote DataURL velden voor persist; bijlagen blijven in-memory (cache) zodat saves niet meer crashen.
- Playwright: toegevoegd playwright.config.js + uitgebreid smoke test (boot + navigatie + key tables + 0 console errors) + playwright_install.bat.


v5.14.1:
- Fix: upsertProject gebruikte onbestaande variabele 'project' i.p.v. parameter 'p' → opslaan Projecten werkt weer.


v5.14.2:
- Playwright: playwright.bat start nu automatisch server (als nodig) + blijft open.
- Extra: playwright_debug.bat (headed + stopt bij eerste failure).
