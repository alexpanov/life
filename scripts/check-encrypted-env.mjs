import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { basename } from "node:path";

// Check both tracked and new, non-ignored files before publication.
const files = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "-z"], { encoding: "utf8" }).split("\0").filter(Boolean);
const errors = [];
for (const file of new Set(files)) {
  const name = basename(file);
  if (/^\.env\.keys(?:\.|$)/.test(name) || /\.(?:pem|key|p12|pfx)$/.test(name)) {
    errors.push(`${file}: private key files cannot be committed`);
    continue;
  }
  let content;
  try { content = readFileSync(file, "utf8"); } catch { continue; }
  if (/-----BEGIN (?:[A-Z]+ )?PRIVATE KEY-----/.test(content) || /DOTENV_PRIVATE_KEY(?:_[A-Z_]+)?\s*=\s*["']?[a-fA-F0-9]{64}/.test(content)) errors.push(`${file}: private key material detected`);
  if (!/^\.env(?:\.|$)/.test(name)) continue;
  if (name === ".env.example") {
    if (content.split(/\r?\n/).some((line) => line.trim() && !line.trim().startsWith("#") && !/^[A-Za-z_][A-Za-z0-9_]*=$/.test(line.trim()))) errors.push(`${file}: templates must contain empty values only`);
    continue;
  }
  if (file !== ".env.development" && file !== ".env.live") {
    errors.push(`${file}: only root .env.development and .env.live may be committed`);
    continue;
  }
  const lines = content.split(/\r?\n/).map((line) => line.trim()).filter((line) => line && !line.startsWith("#"));
  let publicKeys = 0;
  for (const line of lines) {
    if (/^DOTENV_PUBLIC_KEY_(?:DEVELOPMENT|LIVE)="[a-fA-F0-9]+"$/.test(line)) { publicKeys++; continue; }
    if (!/^[A-Za-z_][A-Za-z0-9_]*="encrypted:[A-Za-z0-9+/=]+"$/.test(line)) errors.push(`${file}: all values must be encrypted with dotenvx`);
  }
  if (publicKeys !== 1) errors.push(`${file}: expected one dotenvx public key`);
}
if (errors.length) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else console.log("Encrypted environment check passed (no key values printed).");
