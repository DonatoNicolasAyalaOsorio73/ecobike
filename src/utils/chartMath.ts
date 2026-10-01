/**
 * Smooth path through points (Catmull-Rom converted to cubic Bézier segments).
 * Control points are clamped to [minY, maxY] so the curve never dips below
 * the baseline (e.g. negative distance between a ride day and a rest day).
 */
export function smoothPath(pts: { x: number; y: number }[], minY = -Infinity, maxY = Infinity): string {
  if (pts.length === 0) return "";
  const clamp = (y: number) => Math.min(maxY, Math.max(minY, y));
  let d = `M${pts[0].x},${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: clamp(p1.y + (p2.y - p0.y) / 6) };
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: clamp(p2.y - (p3.y - p1.y) / 6) };
    d += ` C${c1.x},${c1.y} ${c2.x},${c2.y} ${p2.x},${p2.y}`;
  }
  return d;
}
