import { decodePolyline } from "@/utils/polyline";
import { CO2_KG_PER_KM } from "@/utils/rideStats";

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
}

export async function searchPlaces(query: string, near: { lat: number; lng: number } | null, signal?: AbortSignal): Promise<Place[]> {
  const q = query.trim();
  if (q.length < 3) return [];
  const params = new URLSearchParams({ q, limit: "6" });
  if (near) {
    params.set("lat", String(near.lat));
    params.set("lon", String(near.lng));
  }
  const res = await fetch(`${PHOTON}?${params}`, { signal });
  if (!res.ok) throw new Error("No pudimos buscar lugares ahora.");
  const json = await res.json();
  return (json.features ?? []).map((f: any) => {
    const p = f.properties ?? {};
    // Drop empty and repeated parts ("Bogotá, Bogotá, Bogotá D.C." → "Bogotá").
    const parts = [p.street && p.housenumber ? `${p.street} ${p.housenumber}` : p.street, p.district, p.city, p.state].filter(Boolean) as string[];
    const detail = parts.filter((x, i) => !parts.slice(0, i).some((y) => y.startsWith(x) || x.startsWith(y))).join(", ");
    return { name: p.name ?? p.street ?? "Lugar", detail, lat: f.geometry.coordinates[1], lng: f.geometry.coordinates[0] };
  });
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
  };
}
