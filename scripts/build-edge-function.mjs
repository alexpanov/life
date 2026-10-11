import { build } from "esbuild";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const outfile =
  process.env.NICO_EDGE_OUTFILE ?? "supabase/functions/nico/index.js";
await mkdir(path.dirname(outfile), { recursive: true });
await build({
  entryPoints: ["supabase/functions/nico/source.ts"],
  bundle: true,
  format: "esm",
  platform: "browser",
  target: "es2022",
  minify: true,
  legalComments: "none",
  outfile,
});
