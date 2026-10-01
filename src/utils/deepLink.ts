/**
 * Only these in-app paths can be opened from a push notification. Anything
 * else (external URLs, unknown routes) is ignored, so a crafted payload can't
 * navigate the app somewhere unexpected.
 */
const ALLOWED_DEEP_LINK = /^\/(chat\/[\w-]{1,128}|friends|points|stats|profile|map)$/;

export function safeDeepLink(url: unknown): string | null {
  return typeof url === "string" && ALLOWED_DEEP_LINK.test(url) ? url : null;
}
