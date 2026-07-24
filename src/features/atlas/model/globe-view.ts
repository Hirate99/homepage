import { clamp, latLngToXYZ, MAX_GLOBE_SCALE, MIN_GLOBE_SCALE } from './atlas';

export interface GlobeView {
  lat: number;
  lng: number;
  altitude: number;
}

export interface ProjectedPosition {
  x: number;
  y: number;
}

export function globeScaleToAltitude(scale: number) {
  const progress =
    (clamp(scale, MIN_GLOBE_SCALE, MAX_GLOBE_SCALE) - MIN_GLOBE_SCALE) /
    (MAX_GLOBE_SCALE - MIN_GLOBE_SCALE);

  return clamp(2.2 - progress * 1.6, 0.6, 2.2);
}

export function getGlobeView(
  lat: number,
  lng: number,
  scale: number,
): GlobeView {
  return {
    lat,
    lng,
    altitude: globeScaleToAltitude(scale),
  };
}

export function isNodeVisibleFromView(
  node: { lat: number; lng: number },
  view: { lat: number; lng: number },
) {
  const [nodeX, nodeY, nodeZ] = latLngToXYZ(node.lat, node.lng);
  const [viewX, viewY, viewZ] = latLngToXYZ(view.lat, view.lng);

  return nodeX * viewX + nodeY * viewY + nodeZ * viewZ > 0;
}

export function getMarkerLabelTransform(position: ProjectedPosition) {
  if (position.x > 0.74) {
    return 'translate(calc(-100% - 18px), -50%)';
  }

  if (position.x < 0.26) {
    return 'translate(18px, -50%)';
  }

  if (position.y > 0.76) {
    return 'translate(-50%, calc(-100% - 18px))';
  }

  return 'translate(-50%, 18px)';
}
