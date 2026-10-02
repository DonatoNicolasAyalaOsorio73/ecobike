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
  /**
   * Passed bike verification (server's word once synced; the local score
   * before that). A real ride can be verified with 0 points when a daily cap hit.
   * Undefined on rides stored before this field existed.
   */
  verified?: boolean;
  /** Why the ride earned less than its distance (not a bike ride, daily cap...). */
  pointsReason?: string | null;
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
