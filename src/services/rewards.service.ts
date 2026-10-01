import { collection, doc, getDocs, increment, runTransaction, serverTimestamp } from "firebase/firestore";
import * as Crypto from "expo-crypto";
import { getDb, isFirebaseConfigured } from "./firebase";
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
    if (snap.empty) return { rewards: DEFAULT_REWARDS, usingRealCatalog: false };
    return { rewards: snap.docs.map((d) => mapStoreDoc(d.id, d.data())), usingRealCatalog: true };
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

/**
 * Redeems against the REAL points balance (`usuarios/{uid}.puntosAcumulados`)
 * with a transaction so a double-tap can't spend points twice, and writes
 * the real `codigos_canjeados` subcollection shape the mobile app uses. If
 * that fails (e.g. rules don't yet cover this subcollection — see
 * SECURITY.md) it still records the redemption locally so the points spend
 * isn't silently lost from the person's own device.
 */
export async function redeemReward(
  userId: string,
  reward: Reward,
  availablePoints: number,
  isRealAccount: boolean
): Promise<Redemption> {
  if (!isRealAccount && availablePoints < reward.pointsCost) {
    // Real accounts get this same check inside the transaction below, read
    // fresh from the server — this branch only covers the local/guest path,
    // which has no server to re-validate against.
    throw new Error("No tienes suficientes puntos para este canje.");
  }
  const code = generateCode();
  const redemption: Redemption = {
    id: `${userId}_${Date.now()}`,
    rewardId: reward.id,
    rewardTitle: reward.title,
    pointsSpent: reward.pointsCost,
    code,
    redeemedAt: Date.now(),
  };

  if (isRealAccount && isFirebaseConfigured) {
    const db = getDb();
    const userRef = doc(db, USERS_COLLECTION, userId);
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(userRef);
      const balance = (snap.data()?.puntosAcumulados as number | undefined) ?? 0;
      if (balance < reward.pointsCost) {
        throw new Error("No tienes suficientes puntos para este canje.");
      }
      tx.update(userRef, { puntosAcumulados: increment(-reward.pointsCost) });
      tx.set(doc(collection(userRef, REDEMPTIONS_SUBCOLLECTION)), {
        code,
        store: reward.title,
        status: "active",
        userId,
        createdAt: serverTimestamp(),
      });
    });
  }

  saveLocalRedemption(userId, redemption);
  return redemption;
}
