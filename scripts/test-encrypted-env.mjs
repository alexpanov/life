import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import assert from "node:assert/strict";

const directory = mkdtempSync(join(tmpdir(), "life-dotenvx-"));
const gate = resolve("scripts/check-encrypted-env.mjs");
const cli = resolve("node_modules/@dotenvx/dotenvx/src/cli/dotenvx.js");
// This fixture has no credentials. All generated private keys stay in the temp folder.
const expected = "non-secret-roundtrip-fixture";
const environment = { ...process.env };
for (const key of Object.keys(environment)) if (key.startsWith("DOTENV_") || key === "LIFE_ENV_FIXTURE") delete environment[key];
const run = (args) => execFileSync(process.execPath, [cli, ...args], { cwd: directory, env: environment, stdio: "pipe" });
try {
  for (const stage of ["development", "live"]) {
    const filename = `.env.${stage}`;
    writeFileSync(join(directory, filename), `LIFE_ENV_FIXTURE="${expected}"\n`, { mode: 0o600 });
    run(["encrypt", "-f", filename]);
    const ciphertext = readFileSync(join(directory, filename), "utf8");
    assert.ok(ciphertext.includes("encrypted:"));
    assert.ok(!ciphertext.includes(expected));
    run(["run", "-f", filename, "--", process.execPath, "-e", `require('node:assert/strict').equal(process.env.LIFE_ENV_FIXTURE, '${expected}')`]);
  }
  execFileSync("git", ["init", "--quiet"], { cwd: directory, stdio: "pipe" });
  writeFileSync(join(directory, ".gitignore"), ".env.keys\n");
  const check = () => execFileSync(process.execPath, [gate], { cwd: directory, stdio: "pipe" });
  check();
  writeFileSync(join(directory, ".env.live"), "LIFE_ENV_FIXTURE=plaintext\n");
  assert.throws(check);
  rmSync(join(directory, ".env.live"));
  execFileSync("git", ["add", "--force", ".env.keys"], { cwd: directory, stdio: "pipe" });
  assert.throws(check);
  // Keep development ciphertext to verify that private keys are required.
  rmSync(join(directory, ".env.keys"));
  assert.throws(() => run(["run", "-f", ".env.development", "--", process.execPath, "-e", `require('node:assert/strict').equal(process.env.LIFE_ENV_FIXTURE, '${expected}')`]));
  console.log("dotenvx development/live round trips, missing-key rejection, and source guards passed.");
} catch {
  // CLI stderr can include environment details. Do not forward it to logs.
  console.error("dotenvx round-trip failed. No key material logged.");
  process.exitCode = 1;
} finally {
  rmSync(directory, { recursive: true, force: true });
}
