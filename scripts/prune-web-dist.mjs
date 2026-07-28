import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";

const versesDir = join("dist", "json", "verses");

if (existsSync(versesDir)) {
  rmSync(versesDir, { recursive: true, force: true });
  console.log("[prune-web-dist] Removed dist/json/verses");
} else {
  console.log("[prune-web-dist] dist/json/verses not found, skipped");
}
