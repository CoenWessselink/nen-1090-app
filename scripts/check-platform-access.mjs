import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const fail = (message) => {
  console.error(`::error::${message}`);
  process.exitCode = 1;
};

const routes = read('src/app/router/routes.tsx');
const guard = read('src/app/router/RoleGuard.tsx');
const session = read('src/app/session/SessionContext.tsx');

const roleMatch = routes.match(/const PLATFORM_ROLES\s*=\s*\[([^\]]+)\]/s);
if (!roleMatch) {
  fail('PLATFORM_ROLES is missing from routes.tsx.');
} else if (/['"]ADMIN['"]/.test(roleMatch[1])) {
  fail('Tenant role ADMIN must never be present in PLATFORM_ROLES.');
}

if (/hostname|localhost|127\.0\.0\.1|isLocalPreviewBypassEnabled/.test(guard)) {
  fail('RoleGuard contains a host-based authorization bypass.');
}

if (!session.includes("| 'platform.manage'")) {
  fail('AccessPermission platform.manage is missing.');
}

const superadminBlock = session.match(/const superadminPermissions:[\s\S]*?\];/);
if (!superadminBlock?.[0].includes("'platform.manage'")) {
  fail('Superadmin permissions must include platform.manage.');
}

for (const blockName of ['tenantOwnerPermissions', 'tenantAdminPermissions']) {
  const block = session.match(new RegExp(`const ${blockName}:[\\s\\S]*?\\];`));
  if (block?.[0].includes("'platform.manage'")) {
    fail(`${blockName} must not include platform.manage.`);
  }
}

const guardedPlatformPages = [...routes.matchAll(/<RoleGuard\s+allow=\{PLATFORM_ROLES\}([^>]*)>/g)];
if (guardedPlatformPages.length === 0) {
  fail('No platform routes are guarded by PLATFORM_ROLES.');
}
for (const match of guardedPlatformPages) {
  if (!match[1].includes('permission="platform.manage"')) {
    fail('Every platform RoleGuard must require permission="platform.manage".');
  }
}

if (!process.exitCode) {
  console.log(`Platform access checks passed (${guardedPlatformPages.length} guarded routes).`);
}
