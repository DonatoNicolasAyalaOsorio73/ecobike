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
  };
}
