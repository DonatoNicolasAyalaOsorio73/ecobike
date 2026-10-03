// Web build for the Playwright flows only: compiles in the test session of
// src/services/e2e.ts. Output goes to dist-e2e/, never deployed.
import { execSync } from "node:child_process";

execSync("npx expo export --platform web --output-dir dist-e2e --clear", { stdio: "inherit", env: { ...process.env, EXPO_PUBLIC_E2E: "1" } });
