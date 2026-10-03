// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");
const globals = require("globals");

module.exports = defineConfig([
  expoConfig,
  {
    // Generated output, native projects and test artifacts.
    ignores: ["dist/*", "dist-e2e/*", "dist-native/*", "android/*", "ios/*", ".expo/*", "test-results/*", "playwright-report/*"],
  },
  {
    rules: {
      // Platform pairs (`db.native.ts` / `db.web.ts`, `RideMap.native.tsx` /
      // `.web.tsx`) are resolved by Metro; tsc already verifies every import
      // through `moduleSuffixes`, so this rule only produces false positives.
      "import/no-unresolved": "off",
      // Reanimated shared values are mutated through `.value` by design; the
      // React Compiler rule reads that as mutating a hook result.
      "react-hooks/immutability": "off",
      // React Compiler guidance; existing effects that sync state are reviewed
      // case by case, so these warn instead of failing CI.
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/refs": "warn",
    },
  },
  {
    // Node code: Vercel functions, build scripts, test helpers.
    files: ["api/**/*.{js,cjs,mjs}", "scripts/**/*.{js,cjs,mjs}", "firebase/**/*.mjs", "*.config.{js,ts}"],
    languageOptions: { globals: { ...globals.node } },
  },
]);
