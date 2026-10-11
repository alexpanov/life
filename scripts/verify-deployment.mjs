import { appendFile } from "node:fs/promises";
const {
  GITHUB_REPOSITORY,
  GITHUB_RUN_ID,
  GH_TOKEN,
  LIVE_URL,
  GITHUB_SHA,
  GITHUB_STEP_SUMMARY,
} = process.env;
if (
  !GITHUB_REPOSITORY ||
  !GITHUB_RUN_ID ||
  !GH_TOKEN ||
  !LIVE_URL ||
  !GITHUB_SHA
)
  throw Error("Missing Actions deployment context.");
const runResponse = await fetch(
  `https://api.github.com/repos/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}`,
  {
    headers: {
      Authorization: `Bearer ${GH_TOKEN}`,
      Accept: "application/vnd.github+json",
    },
  },
);
if (!runResponse.ok)
  throw Error(`Cannot measure workflow start: ${runResponse.status}`);
const run = await runResponse.json();
const start = Date.parse(run.created_at);
if (!Number.isFinite(start)) throw Error("Invalid workflow start timestamp.");
let verified = false;
for (let attempt = 0; attempt < 15; attempt++) {
  const response = await fetch(
    new URL(
      `build-info.json?commit=${GITHUB_SHA}&attempt=${attempt}`,
      LIVE_URL,
    ),
    { cache: "no-store" },
  );
  if (response.ok) {
    const build = await response.json();
    if (build.commit === GITHUB_SHA) {
      verified = true;
      break;
    }
  }
  await new Promise((resolve) => setTimeout(resolve, 1000));
}
const seconds = (Date.now() - start) / 1000;
const report = `Deployment verified: ${verified}\n\nWorkflow creation → live commit: **${seconds.toFixed(1)} seconds**. Budget: **60 seconds**.\n\n${LIVE_URL}\n`;
console.log(report);
if (GITHUB_STEP_SUMMARY) await appendFile(GITHUB_STEP_SUMMARY, report);
if (!verified) throw Error("The requested commit is not yet visible on Pages.");
