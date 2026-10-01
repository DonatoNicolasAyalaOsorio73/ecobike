import { test } from "node:test";
import assert from "node:assert/strict";
import { safeDeepLink } from "../deepLink.ts";

test("safeDeepLink allows only known in-app routes", () => {
  assert.equal(safeDeepLink("/chat/abc_123-XY"), "/chat/abc_123-XY");
  assert.equal(safeDeepLink("/friends"), "/friends");
  assert.equal(safeDeepLink("https://evil.example"), null);
  assert.equal(safeDeepLink("//evil.example"), null);
  assert.equal(safeDeepLink("/chat/../settings"), null);
  assert.equal(safeDeepLink("/settings/delete-account"), null);
  assert.equal(safeDeepLink(42), null);
  assert.equal(safeDeepLink(undefined), null);
});
