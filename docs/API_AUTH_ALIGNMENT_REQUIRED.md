# API auth alignment required

Deze app-build is aangepast op de bestaande frontend-authmapping. In deze repo zijn de app-bestanden gekoppeld aan de volgende backend-contracten:

- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `POST /auth/reset-password/request`
- `POST /auth/reset-password/confirm`
- `POST /auth/change-password`

## Benodigde minimale request/response contracten

### POST `/auth/login`
Request:
```json
{ "tenant": "demo", "email": "admin@demo.com", "password": "..." }
```
Response:
```json
{
  "access_token": "...",
  "refresh_token": "...",
  "user": {
    "email": "admin@demo.com",
    "tenant": "demo",
    "tenant_id": "tenant-demo",
    "role": "ADMIN",
    "name": "Demo Admin"
  }
}
```

### POST `/auth/refresh`
Request:
```json
{ "refresh_token": "..." }
```
Response:
```json
{ "access_token": "...", "refresh_token": "...", "user": { "email": "..." } }
```

### POST `/auth/change-password`
Request:
```json
{ "current_password": "...", "new_password": "..." }
```
Response:
```json
{ "ok": true, "message": "Wachtwoord gewijzigd" }
```

## Opmerking

De echte `NEN1090-api` repo zat niet in deze chat als bewerkbare codebase. Daarom is hier alleen de app-side aansluiting gebouwd en staat dit document als exacte backend-aanpassingslijst voor de API-repo.
