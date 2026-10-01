import { collection, getDocs, orderBy, query } from "firebase/firestore";
import * as Crypto from "expo-crypto";
import { getDb, isFirebaseConfigured } from "./firebase";
import { api } from "./api";
import { listRedemptions as listLocalRedemptions, saveRedemption as saveLocalRedemption } from "./db";
import { mapStoreDoc } from "@/utils/rewardsMapping";
import { DEFAULT_REWARDS, type Redemption, type Reward } from "@/types/reward";

// Real, live collections — the shipping mobile app's rewards catalog and
// redemption history (see auth.service.ts for the schema-mapping context).
const STORES_COLLECTION = "tiendas";
const USERS_COLLECTION = "usuarios";
const REDEMPTIONS_SUBCOLLECTION = "codigos_canjeados";

/**
 * Reads the real `tiendas` catalog. NOTE: the live project's Firestore
 * rules require `isActive == true` (or admin) to read a `tiendas` document,
 * but the real, existing documents predate that field and don't have it —
 * so this read can come back permission-denied for a normal signed-in user
 * until that's fixed project-side. Falling back to a local list keeps the
 * *redemption flow itself* (the actual feature) usable either way, exactly
 * like ride tracking staying usable offline.
 */
export async function fetchRewardsCatalog(): Promise<{ rewards: Reward[]; usingRealCatalog: boolean }> {
  if (!isFirebaseConfigured) return { rewards: DEFAULT_REWARDS, usingRealCatalog: false };
  try {
    const snap = await getDocs(collection(getDb(), STORES_COLLECTION));
    const active = snap.docs.filter((d) => d.data().isActive !== false);
    if (active.length === 0) return { rewards: DEFAULT_REWARDS, usingRealCatalog: false };
    return { rewards: active.map((d) => mapStoreDoc(d.id, d.data())), usingRealCatalog: true };
  } catch {
    return { rewards: DEFAULT_REWARDS, usingRealCatalog: false };
  }
}

export function getLocalRedemptions(userId: string): Redemption[] {
  return listLocalRedemptions(userId);
}

function generateCode(): string {
  return Crypto.randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase();
}

/** A real account's codes, from any device (owner-readable per firestore.rules). */
export async function fetchRemoteRedemptions(userId: string): Promise<Redemption[]> {
  const snap = await getDocs(
    query(collection(getDb(), USERS_COLLECTION, userId, REDEMPTIONS_SUBCOLLECTION), orderBy("createdAt", "desc"))
  );
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      rewardId: data.rewardId ?? "",
      rewardTitle: data.store ?? "Recompensa",
      pointsSpent: data.pointsSpent ?? 0,
      code: data.code ?? "",
      redeemedAt: typeof data.createdAt?.toMillis === "function" ? data.createdAt.toMillis() : Date.now(),
    };
  });
}

/**
 * Real accounts redeem on the server (api/redeem.js): it reads the price
 * from `tiendas`, checks and deducts `puntosAcumulados` and writes the
 * `codigos_canjeados` doc in one transaction. Guests redeem locally.
 */
export async function redeemReward(
  userId: string,
  reward: Reward,
  availablePoints: number,
  isRealAccount: boolean
): Promise<Redemption> {
  if (isRealAccount && isFirebaseConfigured) {
    const r = await api<{ id: string; code: string; rewardId: string; rewardTitle: string; pointsSpent: number }>(
      "redeem",
      "POST",
      { rewardId: reward.id }
    );
    return { id: r.id, rewardId: r.rewardId, rewardTitle: r.rewardTitle, pointsSpent: r.pointsSpent, code: r.code, redeemedAt: Date.now() };
  }

  if (availablePoints < reward.pointsCost) {
    throw new Error("No tienes suficientes puntos para este canje.");
  }
  const redemption: Redemption = {
    id: `${userId}_${Date.now()}`,
    rewardId: reward.id,
    rewardTitle: reward.title,
    pointsSpent: reward.pointsCost,
    code: generateCode(),
    redeemedAt: Date.now(),
  };
  saveLocalRedemption(userId, redemption);
  return redemption;
}
