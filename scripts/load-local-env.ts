import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

export function loadLocalEnv() {
  for (const fileName of [".env.local", ".env"]) {
    const filePath = resolve(process.cwd(), fileName);

    if (!existsSync(filePath)) {
      continue;
    }

    const lines = readFileSync(filePath, "utf8").split(/\r?\n/);

    for (const line of lines) {
      const trimmed = line.trim();

      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }

      const [key, ...valueParts] = trimmed.replace(/^export\s+/, "").split("=");
      const value = valueParts.join("=").trim();

      if (!key || process.env[key] !== undefined) {
        continue;
      }

      process.env[key] = value.replace(/^["']|["']$/g, "");
    }
  }
}
