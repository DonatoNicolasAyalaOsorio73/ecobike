// Bike maintenance tracker: each part has a service interval in km; the
// odometer is the rider's lifetime distance, so "km since service" is just
// odometer - odometer at the last service. No dates, no backend: it works the
// same for guests and accounts and survives offline.

export interface BikePart {
  id: string;
  name: string;
  hint: string;
  icon: string;
  intervalKm: number;
}

// ponytail: fixed intervals (typical urban-bike guidance); make them editable if riders ask.
export const BIKE_PARTS: BikePart[] = [
  { id: "chain", name: "Cadena", hint: "Limpiar y lubricar", icon: "link-outline", intervalKm: 300 },
  { id: "tires", name: "Llantas", hint: "Revisar presión y desgaste", icon: "ellipse-outline", intervalKm: 500 },
  { id: "brakes", name: "Frenos", hint: "Ajustar y revisar pastillas", icon: "hand-left-outline", intervalKm: 800 },
  { id: "gears", name: "Cambios", hint: "Ajustar desviadores", icon: "cog-outline", intervalKm: 1000 },
  { id: "full", name: "Revisión general", hint: "Taller completo", icon: "construct-outline", intervalKm: 2000 },
];

export interface PartStatus {
  part: BikePart;
  sinceKm: number;
  /** 0..1+ share of the interval used (can exceed 1 when overdue). */
  ratio: number;
  due: boolean;
  remainingKm: number;
}

/** `serviced[id]` is the odometer (km) when that part was last serviced; missing = never (counts from 0). */
export function partStatus(part: BikePart, odometerKm: number, serviced: Record<string, number>): PartStatus {
  const at = Math.min(serviced[part.id] ?? 0, odometerKm); // a reset odometer must not go negative
  const sinceKm = Math.max(0, odometerKm - at);
  const ratio = sinceKm / part.intervalKm;
  return { part, sinceKm, ratio, due: ratio >= 1, remainingKm: Math.max(0, part.intervalKm - sinceKm) };
}

export function maintenanceOverview(odometerKm: number, serviced: Record<string, number>): PartStatus[] {
  return BIKE_PARTS.map((p) => partStatus(p, odometerKm, serviced));
}

export function dueCount(odometerKm: number, serviced: Record<string, number>): number {
  return maintenanceOverview(odometerKm, serviced).filter((s) => s.due).length;
}
