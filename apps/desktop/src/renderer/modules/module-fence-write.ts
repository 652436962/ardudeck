/**
 * The host's side of a module fence proposal: what the write would change,
 * and the write itself.
 */

import type { ExistingFence } from './module-proposal-registry';

interface Shape {
  id: string;
  type: 'inclusion' | 'exclusion';
}

export interface FenceGeometry {
  polygons: (Shape & { vertices: unknown[] })[];
  circles: Shape[];
  returnPoint: unknown;
}

export interface FenceWriter {
  removePolygon: (id: string) => void;
  removeCircle: (id: string) => void;
  addPolygon: (
    type: 'inclusion' | 'exclusion',
    vertices: { lat: number; lon: number }[],
  ) => void;
}

export function summariseFence(g: FenceGeometry): ExistingFence {
  const inPolys = g.polygons.filter((p) => p.type === 'inclusion');
  const inCircles = g.circles.filter((c) => c.type === 'inclusion');
  return {
    inclusionShapes: inPolys.length + inCircles.length,
    inclusionPoints: inPolys.reduce((n, p) => n + p.vertices.length, 0),
    exclusionShapes:
      g.polygons.length - inPolys.length + (g.circles.length - inCircles.length),
    hasReturnPoint: g.returnPoint != null,
  };
}

/**
 * ArduPilot needs the vehicle inside EVERY inclusion shape, so stacking one on
 * the old ones shrinks the allowed area to their intersection. Exclusion zones
 * and the return point are the pilot's and are left alone.
 */
export function replaceInclusion(
  g: FenceGeometry,
  write: FenceWriter,
  points: { lat: number; lng: number }[],
): void {
  for (const p of g.polygons) if (p.type === 'inclusion') write.removePolygon(p.id);
  for (const c of g.circles) if (c.type === 'inclusion') write.removeCircle(c.id);
  write.addPolygon(
    'inclusion',
    points.map((p) => ({ lat: p.lat, lon: p.lng })),
  );
}
