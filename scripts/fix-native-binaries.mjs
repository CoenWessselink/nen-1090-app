import { chmodSync, existsSync } from "node:fs";
import { join } from "node:path";

const candidates = [
  join(process.cwd(), "node_modules", "@esbuild", "linux-x64", "bin", "esbuild"),
  join(process.cwd(), "node_modules", "esbuild", "bin", "esbuild"),
];

for (const file of candidates) {
  if (existsSync(file)) {
    try { chmodSync(file, 0o755); } catch {}
  }
}
console.log("fix-native-binaries: checked esbuild binaries");
