import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";

const versesDir = join("dist", "json", "verses");
const redirectsFile = join("dist", "_redirects");

if (existsSync(versesDir)) {
  rmSync(versesDir, { recursive: true, force: true });
  console.log("[prune-web-dist] Removed dist/json/verses");
} else {
  console.log("[prune-web-dist] dist/json/verses not found, skipped");
}

if (existsSync(redirectsFile)) {
  rmSync(redirectsFile, { force: true });
  console.log("[prune-web-dist] Removed dist/_redirects");
}
