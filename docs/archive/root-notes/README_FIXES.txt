Harde fouten uit jouw console/netwerk:
- /api/v1/auth/me -> 401
- /api/v1/auth/refresh -> 401 Invalid refresh token
- /api/v1/projects?limit=250 -> 422
- scoped weld inspection/status endpoints -> 404
- welds/undefined/inspection -> 422
- client.ts gooit ApiError in mutation flow

Daarom zijn hier 4 concrete fixes aangebracht:

1) src/api/client.ts
- cap op limit naar max 100
- refresh fail wist ongeldige sessie zodat refresh-loops stoppen
- optionalRequest slaat undefined-paden over
- 422 telt als fallback-status bij optional endpoints

2) src/api/projects.ts
- sanitizeListParams
- getProjects retry bij 422 op limit
- project-lijsten gebruiken veilige params

3) src/api/welds.ts
- guards op ontbrekende weldId/projectId
- fallback-volgorde aangepast om minder 404-ruis te geven
- status/inspection/update eerst op generieke weld-routes

4) src/hooks/useWelds.ts
- runtime guards op mutation weldId
- invalidate van weld-inspections key gecorrigeerd

Eerlijke status:
dit lost de concrete fouten uit jouw logs aan de frontend-kant gericht op.
Voor '100% testpakket' moet hierna de proofsuite opnieuw worden gesynchroniseerd en gedraaid op deze nieuwe frontend-stand.
