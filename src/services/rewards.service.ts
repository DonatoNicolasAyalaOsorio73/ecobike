import { collection, getDocs, orderBy, query } from "firebase/firestore";
import * as Crypto from "expo-crypto";
import { getDb, isFirebaseConfigured } from "./firebase";
import { api } from "./api";
import { E2E_SESSION } from "./e2e";
import { listRedemptions as listLocalRedemptions, saveRedemption as saveLocalRedemption } from "./db";
import { mapStoreDoc } from "@/domain/rewardsMapping";
import { DEFAULT_REWARDS, type Redemption, type Reward } from "@/types/reward";

// Real, live collections — the shipping mobile app's rewards catalog and
// redemption history (see auth.service.ts for the schema-mapping context).
const STORES_COLLECTION = "tiendas";
const USERS_COLLECTION = "usuarios";
const REDEMPTIONS_SUBCOLLECTION = "codigos_canjeados";

/**
 * Real accounts get the live `tiendas` catalog (or an error, never fake
 * rewards they couldn't actually redeem). Guests get the local demo list.
 */
export async function fetchRewardsCatalog(
  realAccount = false
): Promise<{ rewards: Reward[]; usingRealCatalog: boolean; error: boolean }> {
  if (!isFirebaseConfigured || !realAccount) return { rewards: DEFAULT_REWARDS, usingRealCatalog: false, error: false };
  if (E2E_SESSION) {
    const rewards = E2E_SESSION.catalog.filter((d) => d.data.isActive !== false).map((d) => mapStoreDoc(d.id, d.data)).filter((rw) => rw.pointsCost > 0);
    return { rewards, usingRealCatalog: true, error: false };
  }
  try {
    const snap = await getDocs(collection(getDb(), STORES_COLLECTION));
    const rewards = snap.docs
      .filter((d) => d.data().isActive !== false)
      .map((d) => mapStoreDoc(d.id, d.data()))
      .filter((rw) => rw.pointsCost > 0)
      .sort((x, y) => x.pointsCost - y.pointsCost);
    return { rewards, usingRealCatalog: true, error: false };
  } catch {
    return { rewards: [], usingRealCatalog: false, error: true };
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
      status: data.status === "used" ? "used" : "active",
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
    return { id: r.id, rewardId: r.rewardId, rewardTitle: r.rewardTitle, pointsSpent: r.pointsSpent, code: r.code, redeemedAt: Date.now(), status: "active" };
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
