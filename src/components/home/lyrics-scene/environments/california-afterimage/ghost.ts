import type { SceneKit } from '../scene-kit';
import {
  createGhostActor,
  type GhostActorWaypoint,
} from '../scene-actors/ghost-actor';
import { CALIFORNIA_BRIDGE } from './geometry';

const GHOST_HEIGHT = 2.45;
const GROUND_CLEARANCE = 0.08;
const COMPACT_GHOST_SCALE = 1.3;
const COMPACT_GHOST_OFFSET_Y = 0.12;
const COMPACT_BRIDGE_OFFSET_Y = 0.16;
const COMPACT_BRIDGE_SURFACE_Y =
  (CALIFORNIA_BRIDGE.surfaceY +
    COMPACT_BRIDGE_OFFSET_Y -
    COMPACT_GHOST_OFFSET_Y) /
  COMPACT_GHOST_SCALE;

function groundedWaypoint(
  anchorY: number,
  x: number,
  z: number,
  scale: number,
): GhostActorWaypoint {
  return {
    anchorY,
    movement: 'grounded',
    scale,
    x,
    y: anchorY + (GHOST_HEIGHT * scale) / 2 + GROUND_CLEARANCE,
    z,
  };
}

export function createCaliforniaGhost(kit: SceneKit) {
  return createGhostActor(kit, {
    aspect: 2 / 3,
    compactScale: COMPACT_GHOST_SCALE,
    frameCount: 4,
    frameDuration: 220,
    frameSequence: [0, 1, 2, 1, 0, 3, 0, 1],
    height: GHOST_HEIGHT,
    idleMotions: ['flutter', 'scan', 'orbit', 'peek'],
    interaction: {
      ariaLabel: 'Play with Aemeath, the pixel mascot',
      id: 'aemeath',
    },
    randomizeWaypoints: true,
    segmentDuration: 9_000,
    textureUrl: '/images/lyrics/aemeath-pixel-sprite.png',
    waypoints: [
      {
        flightGroup: 'left-sky',
        movement: 'floating',
        x: -3.55,
        y: 1.02,
        z: -6.8,
        scale: 0.5,
      },
      {
        flightGroup: 'left-sky',
        movement: 'floating',
        x: -4.15,
        y: -0.5,
        z: -2.4,
        scale: 0.62,
      },
      {
        flightGroup: 'left-sky',
        movement: 'floating',
        x: -3.2,
        y: 2.2,
        z: -8.6,
        scale: 0.45,
      },
      {
        flightGroup: 'left-sky',
        movement: 'floating',
        x: -4.55,
        y: 0.35,
        z: -4.5,
        scale: 0.58,
      },
      {
        flightGroup: 'high-sky',
        movement: 'floating',
        x: -2.85,
        y: 2.45,
        z: -4.4,
        scale: 0.46,
      },
      {
        flightGroup: 'high-sky',
        movement: 'floating',
        x: 0.15,
        y: 3.05,
        z: -7.8,
        scale: 0.42,
      },
      {
        flightGroup: 'high-sky',
        movement: 'floating',
        x: 3.15,
        y: 2.25,
        z: -5.6,
        scale: 0.48,
      },
      {
        flightGroup: 'high-sky',
        movement: 'floating',
        x: 1.45,
        y: 1.8,
        z: -9.4,
        scale: 0.46,
      },
      groundedWaypoint(
        CALIFORNIA_BRIDGE.surfaceY,
        CALIFORNIA_BRIDGE.centerX - 2.25,
        -5.4,
        0.64,
      ),
      groundedWaypoint(
        CALIFORNIA_BRIDGE.surfaceY,
        CALIFORNIA_BRIDGE.centerX + 2.15,
        0.3,
        0.58,
      ),
      groundedWaypoint(
        CALIFORNIA_BRIDGE.surfaceY,
        CALIFORNIA_BRIDGE.centerX + 2.25,
        -9.2,
        0.66,
      ),
      groundedWaypoint(
        CALIFORNIA_BRIDGE.surfaceY,
        CALIFORNIA_BRIDGE.centerX - 2.15,
        -1.7,
        0.56,
      ),
      {
        flightGroup: 'right-sky',
        movement: 'floating',
        x: 4.5,
        y: -0.42,
        z: -4.7,
        scale: 0.68,
      },
      {
        flightGroup: 'right-sky',
        movement: 'floating',
        x: 4.2,
        y: 1.48,
        z: -7.4,
        scale: 0.48,
      },
      {
        flightGroup: 'right-sky',
        movement: 'floating',
        x: 3.65,
        y: 2.05,
        z: -9,
        scale: 0.46,
      },
      {
        flightGroup: 'right-sky',
        movement: 'floating',
        x: 4.75,
        y: 0.45,
        z: -2.8,
        scale: 0.62,
      },
      {
        flightGroup: 'front-sky',
        movement: 'floating',
        x: -2.8,
        y: 0.4,
        z: -1.4,
        scale: 0.64,
      },
      {
        flightGroup: 'front-sky',
        movement: 'floating',
        x: -0.8,
        y: 2,
        z: -2.1,
        scale: 0.54,
      },
      {
        flightGroup: 'front-sky',
        movement: 'floating',
        x: 1.5,
        y: 1.65,
        z: -1.6,
        scale: 0.58,
      },
      {
        flightGroup: 'front-sky',
        movement: 'floating',
        x: 3.3,
        y: 0.3,
        z: -2.4,
        scale: 0.66,
      },
    ],
    compactWaypoints: [
      {
        flightGroup: 'compact-upper',
        movement: 'floating',
        x: -1.32,
        y: 0.88,
        z: -3.4,
        scale: 0.48,
      },
      {
        flightGroup: 'compact-upper',
        movement: 'floating',
        x: -0.35,
        y: 2.15,
        z: -5.6,
        scale: 0.42,
      },
      {
        flightGroup: 'compact-upper',
        movement: 'floating',
        x: 1.25,
        y: 1.35,
        z: -3.8,
        scale: 0.46,
      },
      {
        flightGroup: 'compact-deep',
        movement: 'floating',
        x: -1.18,
        y: 1.4,
        z: -8,
        scale: 0.44,
      },
      {
        flightGroup: 'compact-deep',
        movement: 'floating',
        x: 0.2,
        y: 2.35,
        z: -6.8,
        scale: 0.4,
      },
      {
        flightGroup: 'compact-deep',
        movement: 'floating',
        x: 1.3,
        y: 1.1,
        z: -9,
        scale: 0.46,
      },
      groundedWaypoint(COMPACT_BRIDGE_SURFACE_Y, -2.05, -6.2, 0.58),
      groundedWaypoint(COMPACT_BRIDGE_SURFACE_Y, -2, 0.4, 0.52),
      groundedWaypoint(COMPACT_BRIDGE_SURFACE_Y, 2.1, -9.4, 0.6),
      groundedWaypoint(COMPACT_BRIDGE_SURFACE_Y, -2, -2.4, 0.54),
      {
        flightGroup: 'compact-near',
        movement: 'floating',
        x: -1.2,
        y: 0.15,
        z: -1.8,
        scale: 0.56,
      },
      {
        flightGroup: 'compact-near',
        movement: 'floating',
        x: 0,
        y: 1.55,
        z: -2.3,
        scale: 0.48,
      },
      {
        flightGroup: 'compact-near',
        movement: 'floating',
        x: 1.22,
        y: 0.25,
        z: -2,
        scale: 0.55,
      },
    ],
  });
}
