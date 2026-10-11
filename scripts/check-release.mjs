import { spawn } from "node:child_process";
const started = performance.now();
const commands = ["typecheck", "lint", "test", "build", "env:check"];
const results = await Promise.all(
  commands.map(
    (command) =>
      new Promise((resolve) => {
        const child = spawn("npm", ["run", command], {
          stdio: "inherit",
          env: process.env,
        });
        child.on("error", () => resolve({ command, code: 1 }));
        child.on("exit", (code) => resolve({ command, code }));
      }),
  ),
);
for (const result of results) if (result.code !== 0) process.exitCode = 1;
console.log(
  `Local quality/build stage: ${((performance.now() - started) / 1000).toFixed(2)} seconds`,
);
