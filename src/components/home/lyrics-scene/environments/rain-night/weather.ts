import { Group, PlaneGeometry, RingGeometry, Vector3 } from 'three';

import type { SongColors } from '../../../songs/types';

import type { SceneKit } from '../scene-kit';

export function createWindowRain(kit: SceneKit, colors: SongColors) {
  const group = new Group();
  kit.group.add(group);

  const cityGlowTexture = kit.createTexture(1024, 512, (context) => {
    context.clearRect(0, 0, 1024, 512);
    context.filter = 'blur(28px)';
    [
      {
        x: 90,
        y: 110,
        width: 54,
        height: 260,
        color: 'rgba(95, 170, 183, .28)',
      },
      {
        x: 245,
        y: 190,
        width: 34,
        height: 190,
        color: 'rgba(225, 184, 101, .25)',
      },
      {
        x: 440,
        y: 70,
        width: 70,
        height: 320,
        color: 'rgba(89, 157, 174, .25)',
      },
      {
        x: 650,
        y: 170,
        width: 40,
        height: 210,
        color: 'rgba(171, 105, 135, .2)',
      },
      {
        x: 820,
        y: 100,
        width: 62,
        height: 285,
        color: 'rgba(225, 184, 101, .22)',
      },
      {
        x: 945,
        y: 210,
        width: 30,
        height: 160,
        color: 'rgba(142, 198, 63, .16)',
      },
    ].forEach(({ x, y, width, height, color }) => {
      context.fillStyle = color;
      context.fillRect(x, y, width, height);
    });
    context.filter = 'none';
  });
  if (cityGlowTexture) {
    const cityGlowMaterial = kit.meshMaterial(
      '#ffffff',
      0.2,
      false,
      cityGlowTexture,
    );
    kit.reflectionMaterials.push(cityGlowMaterial);
    kit.addMesh(
      new PlaneGeometry(11.2, 6.7),
      cityGlowMaterial,
      [0, 0.12, -1.92],
      group,
    );
  }

  const rainLoopHeight = 10;
  const createRainLayer = ({
    count,
    length,
    speed,
    opacity,
    color,
    zBase,
    seed,
  }: {
    count: number;
    length: number;
    speed: number;
    opacity: number;
    color: string;
    zBase: number;
    seed: number;
  }) => {
    const points: Vector3[] = [];
    for (let index = 0; index < count; index += 1) {
      const x = ((index * 47 + seed * 31) % 211) / 210;
      const y = ((index * 83 + seed * 17) % 197) / 196;
      const z = ((index * 61 + seed * 13) % 53) / 52;
      const start = new Vector3(
        -6.5 + x * 13,
        -5 + y * rainLoopHeight,
        zBase - z * 0.34,
      );
      const end = start.clone().add(new Vector3(-0.05, -length, 0));
      const repeatedStart = start
        .clone()
        .add(new Vector3(0, rainLoopHeight, 0));
      const repeatedEnd = end.clone().add(new Vector3(0, rainLoopHeight, 0));
      points.push(start, end, repeatedStart, repeatedEnd);
    }

    const material = kit.lineMaterial(color, opacity);
    const lines = kit.addLineSegments(points, material, group);
    lines.renderOrder = 4;
    return { lines, material, opacity, phase: seed * 1.7, speed };
  };
  const rainLayers = [
    createRainLayer({
      count: 136,
      length: 0.34,
      speed: 0.00105,
      opacity: 0.18,
      color: '#7099a3',
      zBase: -2.55,
      seed: 1,
    }),
    createRainLayer({
      count: 104,
      length: 0.66,
      speed: 0.00172,
      opacity: 0.42,
      color: '#b3d5da',
      zBase: -2.08,
      seed: 3,
    }),
  ];
  let lastRainTime: number | null = null;

  const rivuletMaterial = kit.lineMaterial('#8dbbc0', 0.17);
  [-4.4, -2.3, -0.9, 1.8, 3.7, 4.65].forEach((x, index) => {
    const y = 2.9 - (index % 3) * 0.58;
    kit.addLine(
      [
        new Vector3(x, y, -2.02),
        new Vector3(x - 0.04, y - 0.52, -2.02),
        new Vector3(x + 0.02, y - 1.25, -2.02),
      ],
      rivuletMaterial,
      group,
    );
  });

  const dropletMaterial = kit.meshMaterial(colors.accent, 0.12);
  kit.reflectionMaterials.push(dropletMaterial);
  [
    [-3.35, 1.4, 0.34],
    [0.7, 2.35, 0.22],
    [3.15, -0.25, 0.3],
  ].forEach(([x, y, scale]) => {
    const droplet = kit.addMesh(
      new RingGeometry(0.94, 1, 64),
      dropletMaterial,
      [x, y, -1.98],
      group,
    );
    droplet.scale.set(scale, scale * 1.65, 1);
  });

  return {
    group,
    resize: (compact: boolean) => {
      group.scale.x = compact ? 0.88 : 1;
    },
    update: (time: number, entrance: number, reducedMotion: boolean) => {
      const frameDelta =
        lastRainTime === null
          ? 0
          : Math.min(Math.max(time - lastRainTime, 0), 48);
      lastRainTime = time;

      rainLayers.forEach((layer) => {
        layer.material.opacity =
          entrance * layer.opacity * (reducedMotion ? 0.45 : 1);
        if (!reducedMotion) {
          layer.phase =
            (layer.phase + frameDelta * layer.speed) % rainLoopHeight;
        }
        layer.lines.position.y = reducedMotion ? 0 : -layer.phase;
      });
    },
  };
}
