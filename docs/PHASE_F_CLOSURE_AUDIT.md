# Fase F afsluitronde

Deze ronde sluit fase F verder af door:

- dubbele tabelimporten te verwijderen en alle modulepagina's te standaardiseren op `src/components/datatable/*`
- de legacy map `src/components/tables` volledig te verwijderen
- contractvalidatie in Instellingen strenger te maken op payload-vorm in plaats van alleen op request-succes
- het opleverpakket schoon te houden zonder `node_modules` en zonder `dist`

## Nog bewust lokaal gehouden

De volgende frontend-workflows blijven lokaal zolang er geen hard bevestigd bestaand backend-contract is:

- frontend-voorkeuren in Instellingen
- lokale opvolgwerkvoorraad in Lascontrole

Deze flows zijn bewust begrensd en tonen in de UI dat ze niet als nieuwe backend-functionaliteit zijn verzonnen.
