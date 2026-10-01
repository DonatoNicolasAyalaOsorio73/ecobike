import { formatDistance, formatDuration } from "@/utils/format";
import { environmentalImpact } from "@/utils/rideStats";

/** Human, shareable summary of a ride (Spanish, no emojis). */
export function rideShareText(r: { distanceMeters: number; durationSeconds: number; pointsEarned: number }, units: "metric" | "imperial"): string {
  const co2 = environmentalImpact(r.distanceMeters).co2Kg;
  return (
    `Acabo de pedalear ${formatDistance(r.distanceMeters, units)} en ${formatDuration(r.durationSeconds)} con EcoBike ` +
    `y gané ${r.pointsEarned} puntos. Evité ${co2.toFixed(2)} kg de CO₂. ¡Súmate! https://ecobike-demo.vercel.app`
  );
}
