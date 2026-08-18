import { readFile } from 'node:fs/promises';

const routesPath = new URL('../src/app/router/routes.tsx', import.meta.url);
const source = await readFile(routesPath, 'utf8');
const match = source.match(/export\s+const\s+PLATFORM_ADMIN_ROLES\s*=\s*\[([\s\S]*?)\]\s*as\s+const/);

if (!match) {
  throw new Error('PLATFORM_ADMIN_ROLES is missing from routes.tsx');
}

const roles = [...match[1].matchAll(/['"]([^'"]+)['"]/g)].map((item) => item[1]);
const normalize = (value) => String(value || '').replace(/[^a-zA-Z]/g, '').toUpperCase();
const normalizedRoles = new Set(roles.map(normalize));
const forbiddenTenantRoles = ['ADMIN', 'TENANT_ADMIN', 'TENANTADMIN', 'TENANT_OWNER', 'TENANTOWNER', 'OWNER'];
const leakingRoles = forbiddenTenantRoles.filter((role) => normalizedRoles.has(normalize(role)));

if (leakingRoles.length > 0) {
  throw new Error(`Tenant roles may not access superadmin routes: ${leakingRoles.join(', ')}`);
}

if (!normalizedRoles.has('SUPERADMIN') || !normalizedRoles.has('PLATFORMADMIN')) {
  throw new Error('Expected platform administrator aliases are missing');
}

const guardedRoutes = [...source.matchAll(/path:\s*'superadmin[^']*'[\s\S]*?<RoleGuard\s+allow=\{\[\.\.\.PLATFORM_ADMIN_ROLES\]\}/g)];
if (guardedRoutes.length < 5) {
  throw new Error('One or more superadmin routes do not use the central platform role guard');
}

console.log(`Platform access contract OK (${roles.length} aliases, ${guardedRoutes.length} guarded routes).`);
