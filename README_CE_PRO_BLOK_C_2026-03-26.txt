CE PRO BLOK C – 2026-03-26

Aangepast:
- src/features/ce-dossier/CeDossierPage.tsx
- src/features/ce-dossier/components/CeExportBlocks.tsx (nieuw)

Inhoud blok C:
- exportacties voor CE/PDF/ZIP/Excel op de CE dossier pagina
- exporthistorie op basis van live project exports + lokale fallback jobs
- manifest-paneel voor geselecteerde export
- downloadflow:
  - live download via export endpoint als beschikbaar
  - lokale fallback downloadset als live export endpoint nog geen job/download teruggeeft
- retryflow voor bestaande live export jobs

Opmerking:
- Typecheck kon in deze container niet volledig bewezen worden omdat node_modules/dependencies ontbreken in de meegeleverde repo-omgeving.
