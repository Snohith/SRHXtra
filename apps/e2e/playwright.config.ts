import { defineConfig } from "@playwright/test";

/**
 * End-to-end suite for the publish-to-publication pipeline (Step 5).
 *
 * Preconditions (see README "Testing"):
 *   - API on :4000 (built), outbox worker running (pnpm worker)
 *   - production web on :3000, admin on :3001
 *   - Postgres container "srh-news-db" reachable for fixture cleanup
 *
 * Tests are serial: they exercise one shared dev stack and create real rows;
 * the global teardown removes every `e2e-` fixture it can find.
 */
export default defineConfig({
  testDir: "./tests",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  globalTeardown: "./tests/global-teardown.ts",
  use: {
    headless: true,
    viewport: { width: 1360, height: 900 },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  // Screenshots/traces land here; kept out of the repo via .gitignore.
  outputDir: "test-results",
});
