import { defineConfig, devices } from "@playwright/test";

// End-to-end smoke tests against the production web build (dist/), served by
// scripts/serve-dist.mjs. Run: npm run build:web && npm run test:e2e
export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: {
    baseURL: "http://localhost:8082",
    trace: "retain-on-failure",
    locale: "es-CO",
    timezoneId: "America/Bogota",
  },
  projects: [
    { name: "phone", use: { ...devices["iPhone 13"], browserName: "chromium" } },
    { name: "desktop", use: { viewport: { width: 1366, height: 900 } } },
  ],
  webServer: {
    command: "node scripts/serve-dist.mjs",
    url: "http://localhost:8082",
    reuseExistingServer: !process.env.CI,
  },
});
