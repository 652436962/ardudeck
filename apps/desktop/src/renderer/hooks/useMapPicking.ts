import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import { acquirePicking } from './map-picking';

/**
 * While a click places something on the map, the click belongs to the map and
 * not to a shape already drawn there.
 */
export function useMapPicking(active: boolean): void {
  const map = useMap();
  useEffect(() => {
    if (!active) return;
    return acquirePicking(map.getContainer());
  }, [active, map]);
}

/** Mountable form, for a map whose mode flags live in the parent. */
export function MapPicking({ active }: { active: boolean }): null {
  useMapPicking(active);
  return null;
}
