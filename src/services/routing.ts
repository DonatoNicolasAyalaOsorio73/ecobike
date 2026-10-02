import { decodePolyline } from "@/utils/polyline";
import { CO2_KG_PER_KM } from "@/utils/rideStats";
import { haversineMeters } from "@/utils/geo";
import type { Maneuver } from "@/utils/navigation";

/**
 * Eco ruta: place search + bike routing on OpenStreetMap data.
 *  - Photon (komoot) for search, biased to the rider's position.
 *  - Valhalla (FOSSGIS) bicycle costing, which models what a cyclist cares
 *    about: `avoid_bad_surfaces` (unpaved / "destapadas"), `use_roads`
 *    (low = prefer bike lanes and quiet streets = greener, calmer ride),
 *    `bicycle_type`.
 * Both are free community servers with fair-use limits and no key.
 * ponytail: fine for launch traffic; move to a self-hosted Valhalla/Photon or
 * a paid plan (Stadia, GraphHopper) before heavy use.
 */

const PHOTON = "https://photon.komoot.io/api/";
const VALHALLA = "https://valhalla1.openstreetmap.de/route";

export interface Place {
  name: string;
  detail: string;
  lat: number;
  lng: number;
  /** Straight-line distance from the rider, when their position is known. */
  distanceKm: number | null;
}

export interface RoutePrefs {
  /** Stay off unpaved roads ("vías destapadas"). */
  avoidUnpaved: boolean;
  /** Prefer bike lanes and quiet streets over main roads (greener, calmer). */
  greener: boolean;
}

export interface BikeRoute {
  points: { lat: number; lng: number }[];
  km: number;
  minutes: number;
  /** CO₂ avoided vs. making the trip by car (same factor as Progreso). */
  co2Kg: number;
  /** First turn-by-turn instruction (Spanish), for the preview. */
  firstInstruction: string | null;
  /** Turn-by-turn instructions with their position on `points` (navigation). */
  maneuvers: Maneuver[];
}

const LOCAL_KM = 30; // results within this radius are "near you" and come first

export async function searchPlaces(query: string, near: { lat: number; lng: number } | null, signal?: AbortSignal): Promise<Place[]> {
  const q = query.trim();
  if (q.length < 3) return [];
  // Ask for more candidates than we show, then rank by real distance to the rider.
  const params = new URLSearchParams({ q, limit: "15" });
  if (near) {
    params.set("lat", String(near.lat));
    params.set("lon", String(near.lng));
  }
  const res = await fetch(`${PHOTON}?${params}`, { signal });
  if (!res.ok) throw new Error("No pudimos buscar lugares ahora.");
  const json = await res.json();
  const places: Place[] = (json.features ?? []).map((f: any) => {
    const p = f.properties ?? {};
    // Drop empty and repeated parts ("Bogotá, Bogotá, Bogotá D.C." → "Bogotá").
    const parts = [p.street && p.housenumber ? `${p.street} ${p.housenumber}` : p.street, p.district, p.city, p.state].filter(Boolean) as string[];
    const detail = parts.filter((x, i) => !parts.slice(0, i).some((y) => y.startsWith(x) || x.startsWith(y))).join(", ");
    const lat = f.geometry.coordinates[1];
    const lng = f.geometry.coordinates[0];
    return { name: p.name ?? p.street ?? "Lugar", detail, lat, lng, distanceKm: near ? haversineMeters(near, { lat, lng }) / 1000 : null };
  });
  // Near places first (closest first), then the rest in Photon's relevance order.
  return rankByProximity(places).slice(0, 6);
}

/** Places within LOCAL_KM come first sorted by distance; farther ones keep their order after. */
export function rankByProximity(places: Place[]): Place[] {
  const near = places.filter((p) => p.distanceKm != null && p.distanceKm <= LOCAL_KM).sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));
  const far = places.filter((p) => !(p.distanceKm != null && p.distanceKm <= LOCAL_KM));
  return [...near, ...far];
}

/** Up to 3 bike routes (the recommended one first). */
export async function planBikeRoute(from: { lat: number; lng: number }, to: { lat: number; lng: number }, prefs: RoutePrefs): Promise<BikeRoute[]> {
  const request = {
    locations: [
      { lat: from.lat, lon: from.lng },
      { lat: to.lat, lon: to.lng },
    ],
    costing: "bicycle",
    costing_options: {
      bicycle: {
        bicycle_type: prefs.avoidUnpaved ? "Hybrid" : "Mountain",
        avoid_bad_surfaces: prefs.avoidUnpaved ? 0.95 : 0.1,
        use_roads: prefs.greener ? 0.1 : 0.5,
        use_hills: 0.4,
      },
    },
    alternates: 2,
    directions_options: { units: "kilometers", language: "es-ES" },
  };
  const res = await fetch(`${VALHALLA}?json=${encodeURIComponent(JSON.stringify(request))}`);
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.trip) throw new Error(json.error ? "No encontramos una ruta en bicicleta hasta ese lugar." : "No pudimos calcular la ruta ahora.");
  return [json, ...(json.alternates ?? [])].map((r: any) => toRoute(r.trip));
}

function toRoute(trip: any): BikeRoute {
  const leg = trip.legs?.[0] ?? {};
  const km = trip.summary?.length ?? 0;
  return {
    points: decodePolyline(leg.shape ?? "", 6),
    km,
    minutes: Math.round((trip.summary?.time ?? 0) / 60),
    co2Kg: km * CO2_KG_PER_KM,
    firstInstruction: leg.maneuvers?.[1]?.instruction ?? leg.maneuvers?.[0]?.instruction ?? null,
    maneuvers: (leg.maneuvers ?? []).map((m: any) => ({ instruction: m.instruction ?? "", type: m.type ?? 0, beginIndex: m.begin_shape_index ?? 0 })),
  };
}
