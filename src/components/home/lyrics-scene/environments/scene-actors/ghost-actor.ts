import {
  AdditiveBlending,
  Group,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  NearestFilter,
  PlaneGeometry,
  RepeatWrapping,
  RingGeometry,
} from 'three';

import type { SceneKit } from '../scene-kit';

export interface GhostActorWaypoint {
  anchorY?: number;
  flightGroup?: string;
  movement?: 'floating' | 'grounded';
  scale: number;
  x: number;
  y: number;
  z: number;
}

export type GhostActorIdleMotion = 'flutter' | 'orbit' | 'peek' | 'scan';

export interface GhostActorOptions {
  aspect: number;
  compactWaypoints?: readonly GhostActorWaypoint[];
  compactScale: number;
  frameCount: number;
  frameDuration: number;
  frameSequence: readonly number[];
  height: number;
  idleMotions?: readonly GhostActorIdleMotion[];
  interaction?: {
    ariaLabel: string;
    id: string;
  };
  randomizeWaypoints?: boolean;
  segmentDuration: number;
  textureUrl: string;
  waypoints: readonly GhostActorWaypoint[];
}

interface GhostState extends GhostActorWaypoint {
  flightBank: number;
  glitch: number;
  hasFlightPath: boolean;
  isFlying: boolean;
  segmentIndex: number;
  segmentProgress: number;
  visibility: number;
}

interface GhostFlightCurve {
  bankDirection: number;
  controlOne: Pick<GhostActorWaypoint, 'x' | 'y' | 'z'>;
  controlTwo: Pick<GhostActorWaypoint, 'x' | 'y' | 'z'>;
}

interface GhostRouteWaypoint extends GhostActorWaypoint {
  flightCurve?: GhostFlightCurve;
}

interface GhostUniforms {
  glitch: { value: number };
  presence: { value: number };
  time: { value: number };
}

function smoothRange(value: number, start: number, end: number) {
  return MathUtils.smoothstep(value, start, end);
}

function shuffle<T>(items: readonly T[]) {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [
      shuffled[swapIndex],
      shuffled[index],
    ];
  }
  return shuffled;
}

function createFlightCurve(
  current: GhostActorWaypoint,
  next: GhostActorWaypoint,
): GhostFlightCurve {
  const deltaX = next.x - current.x;
  const deltaY = next.y - current.y;
  const deltaZ = next.z - current.z;
  const horizontalDistance = Math.max(Math.hypot(deltaX, deltaZ), 0.001);
  const distance = Math.max(Math.hypot(deltaX, deltaY, deltaZ), 0.001);
  const normalX = -deltaZ / horizontalDistance;
  const normalZ = deltaX / horizontalDistance;
  const bankDirection = Math.random() > 0.5 ? 1 : -1;
  const sideAmount = MathUtils.clamp(
    distance * (0.08 + Math.random() * 0.07),
    0.16,
    0.68,
  );
  const lift = MathUtils.clamp(
    distance * (0.11 + Math.random() * 0.065),
    0.24,
    0.86,
  );
  const usesSway = Math.random() < 0.38;
  const firstSide = sideAmount * bankDirection;
  const secondSide = firstSide * (usesSway ? -0.42 : 0.82);
  const xMargin = Math.min(0.72, 0.34 + Math.abs(deltaX) * 0.18);
  const zMargin = Math.min(0.82, 0.38 + Math.abs(deltaZ) * 0.12);
  const minX = Math.min(current.x, next.x) - xMargin;
  const maxX = Math.max(current.x, next.x) + xMargin;
  const minZ = Math.min(current.z, next.z) - zMargin;
  const maxZ = Math.max(current.z, next.z) + zMargin;

  return {
    bankDirection,
    controlOne: {
      x: MathUtils.clamp(
        current.x + deltaX * 0.28 + normalX * firstSide,
        minX,
        maxX,
      ),
      y: current.y + deltaY * 0.28 + lift * (0.72 + Math.random() * 0.18),
      z: MathUtils.clamp(
        current.z + deltaZ * 0.28 + normalZ * firstSide,
        minZ,
        maxZ,
      ),
    },
    controlTwo: {
      x: MathUtils.clamp(
        current.x + deltaX * 0.72 + normalX * secondSide,
        minX,
        maxX,
      ),
      y: current.y + deltaY * 0.72 + lift * (0.88 + Math.random() * 0.2),
      z: MathUtils.clamp(
        current.z + deltaZ * 0.72 + normalZ * secondSide,
        minZ,
        maxZ,
      ),
    },
  };
}

function sampleCubicBezier(
  start: GhostActorWaypoint,
  curve: GhostFlightCurve,
  end: GhostActorWaypoint,
  progress: number,
) {
  const inverse = 1 - progress;
  const startWeight = inverse * inverse * inverse;
  const controlOneWeight = 3 * inverse * inverse * progress;
  const controlTwoWeight = 3 * inverse * progress * progress;
  const endWeight = progress * progress * progress;
  return {
    x:
      start.x * startWeight +
      curve.controlOne.x * controlOneWeight +
      curve.controlTwo.x * controlTwoWeight +
      end.x * endWeight,
    y:
      start.y * startWeight +
      curve.controlOne.y * controlOneWeight +
      curve.controlTwo.y * controlTwoWeight +
      end.y * endWeight,
    z:
      start.z * startWeight +
      curve.controlOne.z * controlOneWeight +
      curve.controlTwo.z * controlTwoWeight +
      end.z * endWeight,
  };
}

function attachFlightCurves(waypoints: readonly GhostActorWaypoint[]) {
  const route = waypoints.map<GhostRouteWaypoint>((waypoint) => ({
    ...waypoint,
  }));
  route.forEach((current, index) => {
    const next = route[(index + 1) % route.length];
    if (
      current.movement === 'floating' &&
      next.movement === 'floating' &&
      current.flightGroup !== undefined &&
      current.flightGroup === next.flightGroup
    ) {
      current.flightCurve = createFlightCurve(current, next);
    }
  });
  return route;
}

function createWaypointRoute(
  waypoints: readonly GhostActorWaypoint[],
  randomize: boolean,
) {
  if (!randomize) {
    return attachFlightCurves(waypoints);
  }

  const clusterMap = new Map<
    string,
    { key: string; waypoints: { id: number; waypoint: GhostActorWaypoint }[] }
  >();
  waypoints.forEach((waypoint, index) => {
    const key = waypoint.flightGroup
      ? `flight:${waypoint.flightGroup}`
      : `single:${index}`;
    const cluster = clusterMap.get(key) ?? { key, waypoints: [] };
    cluster.waypoints.push({ id: index, waypoint });
    clusterMap.set(key, cluster);
  });
  const baseClusters = [...clusterMap.values()];
  const route: GhostActorWaypoint[] = [];
  let previousClusterKey = '';
  const previousFlightPairs = new Map<string, string>();

  for (let round = 0; round < 6; round += 1) {
    const clusters = shuffle(baseClusters);
    if (clusters[0]?.key === previousClusterKey && clusters.length > 1) {
      [clusters[0], clusters[1]] = [clusters[1], clusters[0]];
    }
    clusters.forEach((cluster) => {
      const candidates = shuffle(cluster.waypoints);
      if (cluster.key.startsWith('flight:') && candidates.length > 1) {
        let selected = candidates.slice(0, 2);
        let pairKey = selected
          .map((candidate) => candidate.id)
          .sort((left, right) => left - right)
          .join(':');
        if (
          pairKey === previousFlightPairs.get(cluster.key) &&
          candidates.length > 2
        ) {
          selected = [selected[0], candidates[2]];
          pairKey = selected
            .map((candidate) => candidate.id)
            .sort((left, right) => left - right)
            .join(':');
        }
        previousFlightPairs.set(cluster.key, pairKey);
        route.push(...selected.map((candidate) => candidate.waypoint));
      } else {
        route.push(candidates[0].waypoint);
      }
    });
    previousClusterKey = clusters.at(-1)?.key ?? '';
  }

  return attachFlightCurves(route);
}

function sampleGhostState(
  time: number,
  waypoints: readonly GhostRouteWaypoint[],
  segmentDuration: number,
): GhostState {
  const safeTime = Math.max(time, 0);
  const segmentPosition = safeTime / segmentDuration;
  const baseSegmentIndex = Math.floor(segmentPosition);
  const segmentIndex = (baseSegmentIndex + waypoints.length) % waypoints.length;
  const progress = segmentPosition - Math.floor(segmentPosition);
  const current = waypoints[segmentIndex];
  const next = waypoints[(segmentIndex + 1) % waypoints.length];
  const canFly =
    current.movement === 'floating' &&
    next.movement === 'floating' &&
    current.flightGroup !== undefined &&
    current.flightGroup === next.flightGroup;
  const side = segmentIndex % 2 === 0 ? 1 : -1;
  let waypoint = current;
  let x = current.x;
  let y = current.y;
  let z = current.z;
  let scale = current.scale;
  let visibility = 1;
  let glitch = 0.05;
  let flightBank = 0;
  let isFlying = false;
  if (canFly) {
    const flightProgress = MathUtils.smootherstep(progress, 0.36, 0.94);
    const point = current.flightCurve
      ? sampleCubicBezier(current, current.flightCurve, next, flightProgress)
      : {
          x: MathUtils.lerp(current.x, next.x, flightProgress),
          y: MathUtils.lerp(current.y, next.y, flightProgress),
          z: MathUtils.lerp(current.z, next.z, flightProgress),
        };
    const flightEnvelope =
      MathUtils.smootherstep(progress, 0.34, 0.44) *
      (1 - MathUtils.smootherstep(progress, 0.86, 0.96));
    x = point.x;
    y = point.y;
    z = point.z;
    scale = MathUtils.lerp(current.scale, next.scale, flightProgress);
    flightBank =
      Math.sin(flightProgress * Math.PI * 2) *
      (current.flightCurve?.bankDirection ?? side) *
      0.018 *
      flightEnvelope;
    isFlying = flightProgress > 0.001 && flightProgress < 0.999;
  } else {
    const usesNextWaypoint = progress >= 0.84;
    waypoint = usesNextWaypoint ? next : current;
    const driftProgress = usesNextWaypoint
      ? smoothRange(progress, 0.84, 1)
      : smoothRange(progress, 0, 0.62);
    x = waypoint.x + side * driftProgress * 0.055;
    y = waypoint.y + Math.sin(safeTime * 0.0012 + segmentIndex * 1.8) * 0.014;
    z =
      waypoint.z +
      (usesNextWaypoint ? 1 - driftProgress : driftProgress) * -0.16;
    scale = waypoint.scale;

    if (progress >= 0.64 && progress < 0.76) {
      const dissolve = smoothRange(progress, 0.64, 0.76);
      visibility = 1 - dissolve;
      glitch = Math.min(1, dissolve * 0.8 + 0.12);
    } else if (progress >= 0.76 && progress < 0.84) {
      visibility = 0;
      glitch = 0.9;
    } else if (progress >= 0.84) {
      const assemble = smoothRange(progress, 0.84, 0.97);
      visibility = assemble;
      glitch = 0.9 - assemble * 0.84;
    }
  }

  return {
    anchorY: waypoint.anchorY,
    flightBank,
    flightGroup: waypoint.flightGroup,
    hasFlightPath: canFly,
    isFlying,
    movement: waypoint.movement,
    x,
    y,
    z,
    scale,
    segmentIndex,
    segmentProgress: progress,
    visibility,
    glitch,
  };
}

function addGhostShader(material: MeshBasicMaterial, cacheKey: string) {
  const uniforms: GhostUniforms = {
    glitch: { value: 0 },
    presence: { value: 1 },
    time: { value: 0 },
  };
  material.userData.ghostUniforms = uniforms;
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uGhostTime = uniforms.time;
    shader.uniforms.uGhostGlitch = uniforms.glitch;
    shader.uniforms.uGhostPresence = uniforms.presence;
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform float uGhostTime;
        uniform float uGhostGlitch;
        uniform float uGhostPresence;`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        float ghostRow = floor(uv.y * 24.0);
        float ghostNoise = fract(sin(ghostRow * 31.7 + floor(uGhostTime * 31.0)) * 43758.5453);
        float ghostBand = step(0.76, ghostNoise);
        transformed.x += (ghostNoise - 0.5) * ghostBand * uGhostGlitch * 0.34;
        transformed.y += sin(ghostRow * 1.7 + uGhostTime * 18.0) * ghostBand * uGhostGlitch * 0.018;`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform float uGhostTime;
        uniform float uGhostGlitch;
        uniform float uGhostPresence;`,
      )
      .replace(
        '#include <map_fragment>',
        `#include <map_fragment>
        float ghostScan = 0.9 + 0.1 * step(0.35, sin(vMapUv.y * 240.0 + uGhostTime * 7.0));
        float ghostRow = floor(vMapUv.y * 90.0);
        float ghostNoise = fract(sin(ghostRow * 19.13 + floor(uGhostTime * 38.0)) * 43758.5453);
        float ghostDropout = step(uGhostGlitch * 0.72, ghostNoise);
        vec2 ghostCell = floor(vMapUv * vec2(18.0, 28.0));
        float ghostPresenceNoise = fract(
          sin(dot(ghostCell, vec2(12.9898, 78.233)) + floor(uGhostTime * 16.0)) * 43758.5453
        );
        float ghostPresenceMask = step(1.0 - uGhostPresence, ghostPresenceNoise);
        diffuseColor.a *= mix(1.0, ghostDropout, uGhostGlitch);
        diffuseColor.a *= ghostPresenceMask;
        diffuseColor.rgb *= ghostScan;
        diffuseColor.rgb += vec3(0.04, 0.11, 0.12) * (0.2 + uGhostGlitch * 0.36);`,
      );
  };
  material.customProgramCacheKey = () => `ghost-actor-${cacheKey}`;
  return uniforms;
}

export function createGhostActor(kit: SceneKit, options: GhostActorOptions) {
  if (options.waypoints.length < 2) {
    throw new Error('Ghost actors require at least two waypoints.');
  }
  if (options.compactWaypoints && options.compactWaypoints.length < 2) {
    throw new Error('Compact ghost actors require at least two waypoints.');
  }

  const desktopWaypoints = createWaypointRoute(
    options.waypoints,
    options.randomizeWaypoints ?? false,
  );
  const compactWaypoints = createWaypointRoute(
    options.compactWaypoints ?? options.waypoints,
    options.randomizeWaypoints ?? false,
  );
  const desktopReducedWaypoint =
    desktopWaypoints.find((waypoint) => waypoint.movement === 'grounded') ??
    desktopWaypoints[0];
  const compactReducedWaypoint =
    compactWaypoints.find((waypoint) => waypoint.movement === 'grounded') ??
    compactWaypoints[0];
  let activeWaypoints = desktopWaypoints;
  let activeReducedWaypoint = desktopReducedWaypoint;

  const group = new Group();
  kit.group.add(group);

  const texture = kit.loadTexture(options.textureUrl);
  texture.magFilter = NearestFilter;
  texture.minFilter = NearestFilter;
  texture.generateMipmaps = false;
  texture.wrapS = RepeatWrapping;
  texture.repeat.set(1 / options.frameCount, 1);

  const geometry = new PlaneGeometry(
    options.height * options.aspect,
    options.height,
    20,
    28,
  );
  const coreMaterial = kit.meshMaterial('#ffffff', 1, false, texture);
  const cyanMaterial = kit.meshMaterial('#72f3eb', 0.2, false, texture);
  const pinkMaterial = kit.meshMaterial('#ff7fa9', 0.15, false, texture);
  [coreMaterial, cyanMaterial, pinkMaterial].forEach((material, index) => {
    material.alphaTest = index === 0 ? 0.055 : 0.025;
    material.depthWrite = false;
    if (index > 0) {
      material.blending = AdditiveBlending;
      material.depthTest = false;
    }
    material.needsUpdate = true;
  });
  const uniforms = [
    addGhostShader(coreMaterial, 'core'),
    addGhostShader(cyanMaterial, 'cyan'),
    addGhostShader(pinkMaterial, 'pink'),
  ];

  const createLayer = (material: MeshBasicMaterial, order: number) => {
    const mesh = kit.addMesh(geometry, material, [0, 0, 0], group);
    mesh.renderOrder = order;
    return mesh;
  };
  const core = createLayer(coreMaterial, 7);
  const cyanEcho = createLayer(cyanMaterial, 6);
  const pinkEcho = createLayer(pinkMaterial, 5);
  cyanEcho.visible = false;
  pinkEcho.visible = false;

  const hitMaterial = kit.meshMaterial('#ffffff', 0, false);
  hitMaterial.colorWrite = false;
  hitMaterial.depthWrite = false;
  const hitTarget = kit.addMesh(
    new PlaneGeometry(
      options.height * options.aspect * 1.55,
      options.height * 1.28,
    ),
    hitMaterial,
    [0, 0, 0],
    group,
  );

  const motionRingMaterial = kit.meshMaterial('#78e9e2', 0);
  motionRingMaterial.blending = AdditiveBlending;
  motionRingMaterial.depthTest = false;
  motionRingMaterial.depthWrite = false;
  const motionRing = kit.addMesh(
    new RingGeometry(0.48, 0.515, 48),
    motionRingMaterial,
    [0, 0, 0],
    group,
  );
  motionRing.renderOrder = 4;
  motionRing.visible = false;

  const scanLineMaterial = kit.meshMaterial('#d6fff4', 0);
  scanLineMaterial.blending = AdditiveBlending;
  scanLineMaterial.depthTest = false;
  scanLineMaterial.depthWrite = false;
  const scanLine = kit.addMesh(
    new PlaneGeometry(1.25, 0.026),
    scanLineMaterial,
    [0, 0, 0],
    group,
  );
  scanLine.renderOrder = 10;
  scanLine.visible = false;

  const sparkGeometry = new PlaneGeometry(0.11, 0.11);
  const sparks = Array.from({ length: 7 }, (_, index) => {
    const material = kit.meshMaterial(
      ['#fff2bf', '#72f3eb', '#ff8eaa'][index % 3],
      0.82,
    );
    material.blending = AdditiveBlending;
    material.depthTest = false;
    material.depthWrite = false;
    const mesh = kit.addMesh(sparkGeometry, material, [0, 0, 0], group);
    mesh.rotation.z = Math.PI / 4;
    mesh.renderOrder = 9;
    mesh.visible = false;
    return { material, mesh };
  });

  const landingMaterial = kit.meshMaterial('#73e7df', 0.16);
  landingMaterial.blending = AdditiveBlending;
  landingMaterial.depthWrite = false;
  const landingRing = kit.addMesh(
    new RingGeometry(0.58, 0.64, 64),
    landingMaterial,
    [0, 0, 0],
    group,
  );
  landingRing.rotation.x = -Math.PI / 2;
  landingRing.renderOrder = 5;

  const applyState = (
    mesh: Mesh,
    material: MeshBasicMaterial,
    state: GhostState,
    offsetX: number,
    opacity: number,
    pose: {
      liftX: number;
      liftY: number;
      rotation: number;
      scaleX: number;
      scaleY: number;
    },
    visible: boolean,
  ) => {
    mesh.visible = visible;
    mesh.position.set(
      state.x + offsetX * (0.5 + state.glitch) + pose.liftX,
      state.y + pose.liftY,
      state.z,
    );
    mesh.scale.set(
      state.scale * pose.scaleX,
      state.scale * pose.scaleY,
      state.scale,
    );
    mesh.rotation.z = pose.rotation;
    material.opacity = opacity;
  };

  const idleMotions = options.idleMotions ?? [
    'flutter',
    'scan',
    'orbit',
    'peek',
  ];
  const actionDuration = 1_750;
  let activationKind = -1;
  let activationStartedAt = Number.NEGATIVE_INFINITY;
  let currentFrame = -1;
  let hoverAmount = 0;
  let isHovered = false;
  let lastPresence = 1;
  let lastTime = 0;
  let previousUpdateAt: number | null = null;
  let routeTime = 0;

  const interaction = options.interaction
    ? {
        ariaLabel: options.interaction.ariaLabel,
        id: options.interaction.id,
        object: hitTarget,
        onActivate: () => {
          if (
            lastPresence < 0.55 ||
            lastTime - activationStartedAt < actionDuration
          ) {
            return;
          }
          activationStartedAt = lastTime;
          activationKind = (activationKind + 1) % 3;
        },
        onHoverChange: (hovered: boolean) => {
          isHovered = hovered;
        },
      }
    : undefined;

  return {
    group,
    interaction,
    resize: (compact: boolean) => {
      activeWaypoints = compact ? compactWaypoints : desktopWaypoints;
      activeReducedWaypoint = compact
        ? compactReducedWaypoint
        : desktopReducedWaypoint;
      group.scale.setScalar(compact ? options.compactScale : 1);
      group.position.y = compact ? 0.12 : 0;
    },
    update: (time: number, reducedMotion: boolean) => {
      const deltaTime =
        previousUpdateAt === null
          ? 0
          : MathUtils.clamp(time - previousUpdateAt, 0, 80);
      previousUpdateAt = time;
      lastTime = time;
      hoverAmount = MathUtils.lerp(
        hoverAmount,
        isHovered && !reducedMotion ? 1 : 0,
        reducedMotion ? 1 : 0.12,
      );
      const activationProgress = MathUtils.clamp(
        (time - activationStartedAt) / actionDuration,
        0,
        1,
      );
      const isActivated =
        !reducedMotion && activationProgress > 0 && activationProgress < 1;
      if (!reducedMotion && !isActivated) {
        routeTime += deltaTime;
      }

      const state = reducedMotion
        ? {
            ...activeReducedWaypoint,
            flightBank: 0,
            visibility: 1,
            glitch: 0,
            hasFlightPath: false,
            isFlying: false,
            segmentIndex: 0,
            segmentProgress: 0.28,
          }
        : sampleGhostState(routeTime, activeWaypoints, options.segmentDuration);
      const cyanState = reducedMotion
        ? { ...state, visibility: 0, glitch: 0 }
        : sampleGhostState(
            routeTime - 90,
            activeWaypoints,
            options.segmentDuration,
          );
      const pinkState = reducedMotion
        ? { ...state, visibility: 0, glitch: 0 }
        : sampleGhostState(
            routeTime - 175,
            activeWaypoints,
            options.segmentDuration,
          );
      lastPresence = state.visibility;
      const isGrounded = state.movement === 'grounded';
      const configuredIdleMotion =
        idleMotions[state.segmentIndex % idleMotions.length] ?? 'flutter';
      const idleMotion = isGrounded ? 'scan' : configuredIdleMotion;
      const motionTime = time * 0.001;
      const gestureDuration = state.hasFlightPath ? 0.32 : 0.62;
      const gestureProgress = MathUtils.clamp(
        state.segmentProgress / gestureDuration,
        0,
        1,
      );
      const gesturePhase = MathUtils.smootherstep(gestureProgress, 0.06, 0.94);
      const gestureEnvelope =
        MathUtils.smootherstep(gestureProgress, 0.06, 0.2) *
        (1 - MathUtils.smootherstep(gestureProgress, 0.72, 0.94));
      const pose = {
        liftX: 0,
        liftY: 0,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
      };

      if (!reducedMotion) {
        const idleLoop = Math.sin(gesturePhase * Math.PI * 2);
        const idleArc = Math.sin(gesturePhase * Math.PI);
        const breath = Math.sin(motionTime * 0.72 + state.segmentIndex * 0.7);

        pose.liftY += isGrounded ? (breath + 1) * 0.003 : breath * 0.006;
        if (state.isFlying) {
          pose.rotation += state.flightBank;
          pose.scaleY += breath * 0.0025;
        } else if (idleMotion === 'flutter') {
          pose.liftX += idleLoop * gestureEnvelope * 0.018;
          pose.liftY += idleArc * gestureEnvelope * 0.026;
          pose.rotation += idleLoop * gestureEnvelope * 0.01;
        } else if (idleMotion === 'scan') {
          pose.scaleX += idleArc * gestureEnvelope * 0.008;
          pose.scaleY -= idleArc * gestureEnvelope * 0.005;
          pose.rotation += idleLoop * gestureEnvelope * 0.006;
        } else if (idleMotion === 'orbit') {
          pose.liftX += idleLoop * gestureEnvelope * 0.034;
          pose.liftY +=
            (1 - Math.cos(gesturePhase * Math.PI * 2)) *
            gestureEnvelope *
            0.012;
          pose.rotation -= idleLoop * gestureEnvelope * 0.016;
        } else {
          const peekSide = state.segmentIndex % 2 === 0 ? 1 : -1;
          pose.liftX += peekSide * idleArc * gestureEnvelope * 0.04;
          pose.liftY += idleArc * gestureEnvelope * 0.01;
          pose.rotation -= peekSide * idleArc * gestureEnvelope * 0.025;
        }

        pose.liftY += hoverAmount * (isGrounded ? 0.012 : 0.02);
        pose.scaleX += hoverAmount * 0.012;
        pose.scaleY += hoverAmount * (isGrounded ? 0 : 0.008);

        if (isActivated) {
          const actionEnvelope =
            MathUtils.smootherstep(activationProgress, 0, 0.18) *
            (1 - MathUtils.smootherstep(activationProgress, 0.72, 1));
          const actionSide = state.segmentIndex % 2 === 0 ? 1 : -1;
          if (activationKind === 0) {
            pose.liftY +=
              actionEnvelope *
              (0.045 + Math.sin(activationProgress * Math.PI * 2) * 0.01);
            pose.rotation +=
              Math.sin(activationProgress * Math.PI * 2) *
              actionEnvelope *
              0.018;
            pose.scaleX += actionEnvelope * 0.014;
            pose.scaleY -= actionEnvelope * 0.008;
          } else if (activationKind === 1) {
            pose.liftX +=
              actionSide * actionEnvelope * (isGrounded ? 0.035 : 0.075);
            pose.liftY += actionEnvelope * 0.03;
            pose.rotation -=
              actionSide * actionEnvelope * (isGrounded ? 0.02 : 0.05);
          } else {
            const loop = Math.sin(activationProgress * Math.PI * 2);
            pose.liftX += loop * actionEnvelope * (isGrounded ? 0.025 : 0.06);
            pose.liftY +=
              Math.sin(activationProgress * Math.PI) *
              actionEnvelope *
              (isGrounded ? 0.04 : 0.07);
            pose.rotation -=
              loop * actionEnvelope * (isGrounded ? 0.018 : 0.045);
          }
        }

        if (isGrounded) {
          pose.liftX = MathUtils.clamp(pose.liftX, -0.04, 0.04);
          pose.liftY = MathUtils.clamp(pose.liftY, 0, 0.07);
          pose.rotation = MathUtils.clamp(pose.rotation, -0.025, 0.025);
          pose.scaleX = MathUtils.clamp(pose.scaleX, 0.985, 1.02);
          pose.scaleY = MathUtils.clamp(pose.scaleY, 0.98, 1);
        } else {
          pose.liftX = MathUtils.clamp(pose.liftX, -0.09, 0.09);
          pose.liftY = MathUtils.clamp(pose.liftY, -0.035, 0.1);
          pose.rotation = MathUtils.clamp(pose.rotation, -0.075, 0.075);
        }
      }

      const idleFrames: Record<GhostActorIdleMotion, readonly number[]> = {
        flutter: [0, 0, 1, 2, 1, 0],
        scan: [2, 2, 1, 2, 2],
        orbit: [0, 1, 2, 1, 0],
        peek: [0, 3, 3, 1, 0],
      };
      const idleFrameSequence = idleFrames[idleMotion];
      const restFrame = isGrounded ? 2 : 0;
      const sequenceIndex = Math.min(
        idleFrameSequence.length - 1,
        Math.floor(gesturePhase * idleFrameSequence.length),
      );
      let frame =
        reducedMotion || gestureEnvelope < 0.035
          ? restFrame
          : idleFrameSequence[sequenceIndex];
      if (state.isFlying) {
        const flightFrames = [0, 0, 1, 1, 2, 2, 1, 1, 0, 0] as const;
        const flightFrameProgress = MathUtils.smootherstep(
          state.segmentProgress,
          0.36,
          0.94,
        );
        frame =
          flightFrames[
            Math.min(
              flightFrames.length - 1,
              Math.floor(flightFrameProgress * flightFrames.length),
            )
          ] ?? frame;
      }
      if (hoverAmount > 0.35) {
        const hoverFrames = [2, 2, 1, 2] as const;
        frame =
          hoverFrames[Math.floor(time / 360) % hoverFrames.length] ?? frame;
      }
      if (isActivated) {
        const actionFrames =
          [
            [0, 0, 1, 2, 1, 0, 0],
            [2, 2, 3, 2, 1, 2, 2],
            [0, 0, 1, 3, 1, 0, 0],
          ][activationKind] ?? options.frameSequence;
        frame =
          actionFrames[
            Math.min(
              actionFrames.length - 1,
              Math.floor(activationProgress * actionFrames.length),
            )
          ] ?? frame;
      }
      frame = MathUtils.clamp(frame, 0, options.frameCount - 1);
      if (frame !== currentFrame) {
        texture.offset.x = frame / options.frameCount;
        currentFrame = frame;
      }

      const actionPulse = isActivated
        ? MathUtils.smootherstep(activationProgress, 0, 0.18) *
          (1 - MathUtils.smootherstep(activationProgress, 0.72, 1))
        : 0;
      const interactionGlitch = actionPulse * 0.18;
      const echoStrength = MathUtils.clamp(
        Math.max(state.glitch - 0.2, interactionGlitch) * 1.05,
        0,
        1,
      );
      const coreVisible = state.visibility > 0.015;

      applyState(core, coreMaterial, state, 0, 1, pose, coreVisible);
      applyState(
        cyanEcho,
        cyanMaterial,
        cyanState,
        -0.055,
        0.2 * echoStrength,
        pose,
        echoStrength > 0.04 && cyanState.visibility > 0.08,
      );
      applyState(
        pinkEcho,
        pinkMaterial,
        pinkState,
        0.065,
        0.15 * echoStrength,
        pose,
        echoStrength > 0.04 && pinkState.visibility > 0.08,
      );
      uniforms.forEach((uniform, index) => {
        const layerState =
          index === 0 ? state : index === 1 ? cyanState : pinkState;
        uniform.time.value = reducedMotion ? 0 : time * 0.001;
        uniform.glitch.value = reducedMotion
          ? 0
          : MathUtils.clamp(layerState.glitch + interactionGlitch, 0, 1);
        uniform.presence.value = reducedMotion ? 1 : layerState.visibility;
      });

      hitTarget.visible = state.visibility > 0.55;
      hitTarget.position.copy(core.position);
      hitTarget.scale.copy(core.scale);
      hitTarget.rotation.copy(core.rotation);

      const scanStrength =
        idleMotion === 'scan' && !state.isFlying && coreVisible
          ? gestureEnvelope
          : 0;
      scanLine.visible = scanStrength > 0.02;
      scanLine.position.set(
        state.x + pose.liftX,
        state.y + pose.liftY + MathUtils.lerp(0.3, -0.28, gesturePhase),
        state.z + 0.05,
      );
      scanLine.scale.setScalar(state.scale * (0.9 + scanStrength * 0.16));
      scanLineMaterial.opacity = 0.52 * scanStrength;

      const ringStrength = Math.max(
        idleMotion === 'orbit' && coreVisible ? 0.16 : 0,
        hoverAmount * 0.34,
        actionPulse * 0.32,
      );
      motionRing.visible = ringStrength > 0.025;
      motionRing.position.set(
        state.x + pose.liftX,
        state.y + pose.liftY,
        state.z - 0.025,
      );
      motionRing.rotation.z =
        motionTime * 0.55 + (isActivated ? activationProgress * Math.PI : 0);
      motionRing.scale.setScalar(state.scale * (0.86 + ringStrength * 0.28));
      motionRingMaterial.opacity = 0.2 * ringStrength;

      const sparkStrength = isActivated
        ? actionPulse * 0.42
        : hoverAmount * 0.2;
      sparks.forEach(({ material, mesh }, index) => {
        const angle = motionTime * (1.8 + (index % 3) * 0.18) + index * 0.9;
        const radius =
          state.scale *
          (0.5 + (index % 2) * 0.13 + (isActivated ? actionPulse * 0.08 : 0));
        mesh.visible = sparkStrength > 0.035 && state.visibility > 0.08;
        mesh.position.set(
          state.x + pose.liftX + Math.cos(angle) * radius,
          state.y + pose.liftY + Math.sin(angle) * radius * 0.56,
          state.z + 0.04 + index * 0.002,
        );
        mesh.rotation.z = Math.PI / 4 + angle;
        mesh.scale.setScalar(0.55 + sparkStrength * 0.35);
        material.opacity = 0.58 * sparkStrength;
      });

      landingRing.visible =
        state.anchorY !== undefined &&
        state.visibility > 0 &&
        (hoverAmount > 0.04 || isActivated || state.glitch > 0.25);
      landingRing.position.set(state.x, (state.anchorY ?? 0) + 0.025, state.z);
      const landingPulse = reducedMotion
        ? 0.65
        : 0.72 + Math.sin(time * 0.0034) * 0.18 + state.glitch * 0.4;
      landingRing.scale.setScalar(landingPulse * state.scale);
      landingMaterial.opacity =
        0.22 *
        Math.max(hoverAmount, interactionGlitch, state.glitch) *
        state.visibility;
    },
  };
}
