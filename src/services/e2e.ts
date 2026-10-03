import type { UserProfile } from "@/types/user";

/**
 * Test-only signed-in session for the Playwright flows (e2e/flows.spec.ts).
 * It exists only in a web build made with EXPO_PUBLIC_E2E=1 (`npm run
 * build:web:e2e`); in every other build this constant folds to null and the
 * code below is dropped. It never grants anything real: the server still
 * verifies every token, and the tests mock /api with page.route.
 */
export interface E2ESession {
  uid: string;
  token: string;
  profile: UserProfile;
  /** `tiendas` documents served as the rewards catalog. */
  catalog: { id: string; data: Record<string, unknown> }[];
}

export const E2E_SESSION: E2ESession | null =
  process.env.EXPO_PUBLIC_E2E === "1" && typeof window !== "undefined" ? ((window as any).__ECOBIKE_E2E__ ?? null) : null;
