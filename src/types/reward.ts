import STORES from "@/data/stores.json";

export interface Reward {
  id: string;
  title: string;
  subtitle: string;
  details: string;
  pointsCost: number;
  icon: string; // Ionicons name
  imageUrl?: string; // store logo (tiendas.logo), shown instead of the icon
}

export interface Redemption {
  id: string;
  rewardId: string;
  rewardTitle: string;
  pointsSpent: number;
  code: string;
  redeemedAt: number;
  /** "used" once a store validated it (api/validate.js). Local/guest codes have none. */
  status?: "active" | "used";
}

// Works with zero backend configuration — a real Firestore-backed catalog
// (rewards.service.ts) replaces this the moment Firebase is configured, but
// the redemption flow (points math, codes, "Mis códigos") is fully usable
// without it, same local-first principle as ride tracking.
// The partner stores (src/data/stores.json, also what scripts/seed-stores.mjs
// loads into Firestore), with their logos inline.
export const DEFAULT_REWARDS: Reward[] = STORES.map((s) => ({
  id: s.id,
  title: s.name,
  subtitle: s.description,
  details: `Presenta tu código en ${s.name}: ${s.description.charAt(0).toLowerCase()}${s.description.slice(1)}.`,
  pointsCost: s.pointsRequired,
  icon: s.icon,
  imageUrl: s.logo,
}));
