# App + API auth alignment build

Aangepast in deze build:

- login UX verbeterd
- forgot password uitgebreid met tenantveld
- reset password uitgebreid met bevestiging en sterkte-indicator
- nieuwe change-password pagina toegevoegd
- nieuwe logout route toegevoegd
- topbar logout laat nu eerst de bestaande logoutflow lopen
- refresh-flow gecentraliseerd via `src/api/auth.ts`
- instellingenpagina bevat directe actie voor wachtwoord wijzigen
- backend-aanpassingslijst toegevoegd in `docs/API_AUTH_ALIGNMENT_REQUIRED.md`

Validatie:
- `npm run lint`
- `npm run build`
