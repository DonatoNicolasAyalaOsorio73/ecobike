import { listRides, saveRide, unlockAchievement, wipeAllLocalData } from "./db";
import { generateDemoRides } from "@/utils/demoData";
import { computeRiderStats, evaluateAchievements } from "@/utils/gamification";

/** Fills a brand-new guest session with a realistic history (see utils/demoData). */
export function seedDemoIfEmpty(userId: string) {
  if (listRides(userId).length > 0) return;
  const rides = generateDemoRides(userId);
  rides.forEach(saveRide);
  evaluateAchievements(computeRiderStats(rides), new Set()).forEach((a) => unlockAchievement(userId, a.code));
}

/** "Restablecer datos demo": wipe the guest's local data and seed again. */
export function resetDemoData(userId: string) {
  wipeAllLocalData(userId);
  seedDemoIfEmpty(userId);
}
