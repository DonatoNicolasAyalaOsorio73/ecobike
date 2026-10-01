import type { Ride, TrackPoint } from "@/types/ride";
import { pointsForRide } from "@/utils/gamification";
import { estimateCalories, totalElevationGainMeters } from "@/utils/geo";
import { seededRandom } from "@/utils/random";

// Deterministic demo content for "Explorar sin cuenta": a believable history
// so every screen (stats, history, ride detail, points) has something to show.

export { seededRandom } from "@/utils/random";

export const DEMO_RIDE_PREFIX = "demo_";
const BOGOTA = { lat: 4.6533, lng: -74.0836 };
const METERS_PER_DEG_LAT = 111_320;

function track(rand: () => number, startedAt: number, distanceMeters: number, durationSeconds: number): TrackPoint[] {
  const steps = Math.max(10, Math.round(distanceMeters / 120));
  const stepMeters = distanceMeters / steps;
  const dt = (durationSeconds * 1000) / steps;
  let lat = BOGOTA.lat + (rand() - 0.5) * 0.06;
  let lng = BOGOTA.lng + (rand() - 0.5) * 0.06;
  let heading = rand() * Math.PI * 2;
  let alt = 2560 + rand() * 40;
  // Pace varies smoothly (traffic lights, hills, sprints) but the total
  // duration is preserved: per-step time weights normalized to the ride.
  const weights: number[] = [];
  let w = 1;
  for (let i = 0; i < steps; i++) {
    w = Math.max(0.6, Math.min(1.6, w + (rand() - 0.5) * 0.25));
    weights.push(w);
  }
  const scale = (durationSeconds * 1000) / weights.reduce((x, y) => x + y, 0);
  const points: TrackPoint[] = [];
  let t = startedAt;
  for (let i = 0; i <= steps; i++) {
    const stepMs = i < steps ? weights[i] * scale : dt;
    points.push({ lat, lng, altitude: alt, timestamp: t, speed: stepMeters / (stepMs / 1000) });
    t += i < steps ? stepMs : 0;
    heading += (rand() - 0.5) * 0.6; // gentle turns, like real streets
    lat += (Math.cos(heading) * stepMeters) / METERS_PER_DEG_LAT;
    lng += (Math.sin(heading) * stepMeters) / (METERS_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180));
    alt += (rand() - 0.48) * 3;
  }
  return points;
}

/** ~4 months of rides up to now: weekday commutes, weekend long rides, some rest days. */
export function generateDemoRides(userId: string, now = new Date(), days = 120): Ride[] {
  const rand = seededRandom(20261001);
  const rides: Ride[] = [];
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  for (let back = days; back >= 0; back--) {
    const day = new Date(today);
    day.setDate(today.getDate() - back);
    const weekday = (day.getDay() + 6) % 7; // 0 = Monday
    const weekend = weekday >= 5;
    if (rand() < (weekend ? 0.35 : 0.25)) continue; // rest day

    const sessions = weekend
      ? [{ hour: 7 + Math.floor(rand() * 3), km: 18 + rand() * 32, kmh: 17 + rand() * 7 }]
      : [
          { hour: 6 + Math.floor(rand() * 2), km: 4 + rand() * 5, kmh: 14 + rand() * 6 },
          ...(rand() < 0.7 ? [{ hour: 17 + Math.floor(rand() * 2), km: 4 + rand() * 5, kmh: 13 + rand() * 6 }] : []),
        ];

    for (const s of sessions) {
      const startedAt = day.getTime() + s.hour * 3_600_000 + Math.floor(rand() * 50) * 60_000;
      const distanceMeters = Math.round(s.km * 1000);
      const durationSeconds = Math.round((s.km / s.kmh) * 3600);
      if (startedAt + durationSeconds * 1000 > now.getTime()) continue; // only rides already finished
      const points = track(rand, startedAt, distanceMeters, durationSeconds);
      const ride: Ride = {
        id: `${DEMO_RIDE_PREFIX}${userId}_${startedAt}`,
        userId,
        startedAt,
        endedAt: startedAt + durationSeconds * 1000,
        distanceMeters,
        durationSeconds,
        avgSpeedKmh: Math.round(s.kmh * 10) / 10,
        maxSpeedKmh: Math.round((s.kmh + 8 + rand() * 12) * 10) / 10,
        elevationGainMeters: Math.round(totalElevationGainMeters(points)),
        caloriesKcal: estimateCalories(distanceMeters),
        points,
        pointsEarned: 0,
        synced: true,
        error: null,
      };
      ride.pointsEarned = pointsForRide(ride);
      rides.push(ride);
    }
  }
  // A ride that finished a little while ago, so "today/this month" is never empty in the demo.
  const recentStart = now.getTime() - 80 * 60_000;
  if (!rides.some((r) => r.startedAt >= today.getTime())) {
    const points = track(rand, recentStart, 8200, 1680);
    const recent: Ride = {
      id: `${DEMO_RIDE_PREFIX}${userId}_${recentStart}`,
      userId,
      startedAt: recentStart,
      endedAt: recentStart + 1_680_000,
      distanceMeters: 8200,
      durationSeconds: 1680,
      avgSpeedKmh: 17.6,
      maxSpeedKmh: 31.2,
      elevationGainMeters: Math.round(totalElevationGainMeters(points)),
      caloriesKcal: estimateCalories(8200),
      points,
      pointsEarned: 0,
      synced: true,
      error: null,
    };
    recent.pointsEarned = pointsForRide(recent);
    rides.push(recent);
  }
  return rides;
}

export interface DemoFriend {
  uid: string;
  displayName: string;
  username: string;
  points: number;
}

export const DEMO_FRIENDS: DemoFriend[] = [
  { uid: "demo_friend_laura", displayName: "Laura Gómez", username: "lauragomez", points: 4210 },
  { uid: "demo_friend_andres", displayName: "Andrés Rojas", username: "arojas", points: 2875 },
  { uid: "demo_friend_camila", displayName: "Camila Torres", username: "camitorres", points: 1960 },
  { uid: "demo_friend_mateo", displayName: "Mateo Herrera", username: "mateoh", points: 980 },
];

export interface DemoMessage {
  from: "me" | string;
  text: string;
  minutesAgo: number;
}

export const DEMO_CHATS: Record<string, DemoMessage[]> = {
  demo_friend_laura: [
    { from: "demo_friend_laura", text: "¿Vamos mañana por la ciclovía de la Séptima?", minutesAgo: 180 },
    { from: "me", text: "¡Sí! ¿A las 7?", minutesAgo: 175 },
    { from: "demo_friend_laura", text: "Perfecto, nos vemos en el parque 93", minutesAgo: 170 },
  ],
  demo_friend_andres: [{ from: "demo_friend_andres", text: "Ya casi te alcanzo en el ranking, cuidado", minutesAgo: 1440 }],
};
