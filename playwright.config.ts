import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests/browser",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 15000,
  use: {
    baseURL: "http://127.0.0.1:4173/life/",
    browserName: "chromium",
    channel: "chrome",
    headless: true,
  },
  webServer: {
    command: "npx vite preview --host 127.0.0.1 --port 4173",
    url: "http://127.0.0.1:4173/life/",
    reuseExistingServer: false,
    timeout: 15000,
  },
  reporter: [["list"]],
});
