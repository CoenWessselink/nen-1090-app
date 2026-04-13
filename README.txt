Compatibele auth-fix overschrijfset.

Deze set behoudt het bestaande SessionContext-contract:
- isBootstrapping
- isAuthenticated
- hasRole
- hasPermission
- isImpersonating
- impersonationTenantName
- tenant
- role

Bestanden:
- src/app/store/auth-store.ts
- src/app/session/SessionContext.tsx
- src/app/router/ProtectedRoute.tsx
- src/features/auth/LoginPage.tsx
- src/features/auth/LogoutPage.tsx
