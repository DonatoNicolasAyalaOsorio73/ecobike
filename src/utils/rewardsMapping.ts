import type { Reward } from "@/types/reward";

/** Maps a real `tiendas/{id}` document (see rewards.service.ts) to the app's Reward shape. */
export function mapStoreDoc(id: string, data: Record<string, any>): Reward {
  return {
    id,
    title: data.name ?? "Recompensa",
    subtitle: data.description ?? "",
    details: data.description ?? "",
    // Legacy documents store this as a string (e.g. "80"), not a number.
    pointsCost: Number(data.pointsRequired ?? 0) || 0,
    icon: "gift-outline",
    imageUrl: typeof data.logo === "string" && data.logo.startsWith("https://") ? data.logo : undefined,
  };
}

/** Accent- and case-insensitive text ("cafe" matches "Café"). */
const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

/**
 * What the store list shows: optional "only what I can redeem" filter,
 * search over store name and description, redeemable first, then cheapest.
 */
export function visibleRewards(rewards: Reward[], points: number, query: string, onlyAffordable: boolean): Reward[] {
  const q = norm(query.trim());
  const can = (r: Reward) => r.pointsCost <= points;
  return rewards
    .filter((r) => !onlyAffordable || can(r))
    .filter((r) => !q || norm(`${r.title} ${r.subtitle}`).includes(q))
    .sort((a, b) => Number(can(b)) - Number(can(a)) || a.pointsCost - b.pointsCost);
}
