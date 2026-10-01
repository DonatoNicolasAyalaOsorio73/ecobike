export type RideStatus =
  | "IDLE"
  | "PREPARING"
  | "ACTIVE"
  | "PAUSED"
  | "FINISHING"
  | "COMPLETED"
  | "ERROR";

export interface TrackPoint {
  lat: number;
  lng: number;
  altitude: number | null;
  timestamp: number;
  speed: number | null; // m/s, from GPS when available
}

export interface Ride {
  id: string;
  userId: string;
  startedAt: number;
  endedAt: number | null;
  distanceMeters: number;
  durationSeconds: number;
  avgSpeedKmh: number;
  maxSpeedKmh: number;
  elevationGainMeters: number;
  caloriesKcal: number;
  points: TrackPoint[];
  pointsEarned: number;
  synced: boolean;
  error: string | null;
}

export function createEmptyRide(userId: string, id: string): Ride {
  return {
    id,
    userId,
    startedAt: Date.now(),
    endedAt: null,
    distanceMeters: 0,
    durationSeconds: 0,
    avgSpeedKmh: 0,
    maxSpeedKmh: 0,
    elevationGainMeters: 0,
    caloriesKcal: 0,
    points: [],
    pointsEarned: 0,
    synced: false,
    error: null,
  };
}
