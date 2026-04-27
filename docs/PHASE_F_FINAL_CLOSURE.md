# Fase F – Final Closure

Deze fase trekt de frontend inhoudelijk verder dicht zonder een nieuwe backend of database te verzinnen.

## In deze stap toegevoegd

- contractvalidatie-tab in Instellingen
- runtime-hercontrole van bekende backendcontracten
- role-aware admincontractcheck voor `/admin/tenants`
- hooks voor settings/tenants uitbreidbaar gemaakt met `enabled`
- releasepakket opgeschoond voor overdracht (zonder `node_modules` en `dist`)

## Doel van deze stap

De frontend moet per module sneller zichtbaar maken of de bestaande backendcontracten echt bereikbaar zijn:

- `/health`
- `/settings`
- `/projects`
- `/welds`
- `/documents`
- `/planning`
- `/reports`
- `/admin/tenants` (alleen admin/superadmin)

## Nog niet hard bevestigd

- live runtime-validatie tegen de echte productieomgeving
- volledige acceptatietestdekking per role/device combinatie
- alle optionele admin-mutaties
