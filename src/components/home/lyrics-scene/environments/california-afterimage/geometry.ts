export const CALIFORNIA_BRIDGE = {
  centerX: 0.52,
  deckStartZ: 9,
  startZ: 1.2,
  endZ: -24,
  width: 6.25,
  surfaceY: -3.62,
  screenTopY: -1.9,
} as const;

export const californiaDeckLength =
  CALIFORNIA_BRIDGE.deckStartZ - CALIFORNIA_BRIDGE.endZ;

export const californiaDeckCenterZ =
  (CALIFORNIA_BRIDGE.deckStartZ + CALIFORNIA_BRIDGE.endZ) / 2;

export const californiaBridgeLength =
  CALIFORNIA_BRIDGE.startZ - CALIFORNIA_BRIDGE.endZ;

export const californiaBridgeCenterZ =
  (CALIFORNIA_BRIDGE.startZ + CALIFORNIA_BRIDGE.endZ) / 2;
