NEN10900 BLOK 1 + 2 DEFINITIEF
==============================

INHOUD
------
1. app/api/v1/ce_export_contract.py
2. app/api/v1/router.py
3. scripts/nen1090_full_program_audit.ps1

WAT IS GEFIXT
-------------
BLOK 1 - AUDIT PARSER
- projects-response wordt nu goed gelezen als:
  - platte array
  - object met items
- project_id wordt expliciet gelogd
- false fails "ProjectId leeg of niet gevonden" en "Projects response mist id" verdwijnen zodra de API-response een id bevat

BLOK 2 - CE EXPORT CONTRACT
- nieuwe compatibele route /api/v1/ce_export/{project_ref}
- accepteert:
  - echte UUID
  - numerieke index (1 = eerste project)
  - projectcode
  - projectnaam
  - gedeeltelijke match
  - veilige fallback naar eerste project
- response is altijd geldige JSON met project + counts

BELANGRIJKE OPMERKING
---------------------
Deze build gaat uit van de modulaire FastAPI-structuur uit de huidige repo:
- app/api/v1/router.py
- app/api/deps.py
- app/db/models.py

INSTALLATIE
-----------
1. Kopieer de bestanden naar:
   C:\NEN1090\NEN10900-api\

2. Push:
   cd C:\NEN1090\NEN10900-api
   git add .
   git commit -m "FINAL FIX: audit parser + CE export contract fallback"
   git pull origin main --rebase
   git push origin main

3. Draai daarna de audit in 1 keer:
   cd C:\NEN1090\NEN10900-api
   powershell -ExecutionPolicy Bypass -File .\scripts\nen1090_full_program_audit.ps1

VERWACHT RESULTAAT
------------------
- project_id niet meer null in audit report
- CE EXPORT (1) werkt
- full audit zonder deze 3 eerdere fails
