import { CircleGeometry, Group, PlaneGeometry } from 'three';

import type { SongColors } from '../../../songs/types';

import type { RainSceneKit } from './scene-kit';

type Point = [number, number];

interface PedestrianRoute {
  from: Point;
  to: Point;
}

export function createRainIntersection(kit: RainSceneKit, colors: SongColors) {
  const group = new Group();
  kit.group.add(group);

  const ground = kit.addMesh(
    new PlaneGeometry(200, 200),
    kit.meshMaterial(colors.background, 0.98, true),
    [0, -3.97, -40],
    group,
  );
  ground.rotation.x = -Math.PI / 2;

  const roadTexture = kit.createTexture(1536, 1536, (context) => {
    context.clearRect(0, 0, 1536, 1536);

    const drawRoadArm = (points: Point[], width: number) => {
      context.save();
      context.strokeStyle = '#07171d';
      context.lineWidth = width;
      context.lineCap = 'butt';
      context.lineJoin = 'round';
      context.beginPath();
      points.forEach(([x, y], index) => {
        if (index === 0) {
          context.moveTo(x, y);
        } else {
          context.lineTo(x, y);
        }
      });
      context.stroke();
      context.restore();
    };

    // Shibuya's crossing opens toward five unequal approaches rather than a
    // symmetrical four-way junction.
    drawRoadArm(
      [
        [-180, 20],
        [260, 270],
        [690, 745],
      ],
      370,
    );
    drawRoadArm(
      [
        [1190, -120],
        [1080, 300],
        [850, 720],
      ],
      310,
    );
    drawRoadArm(
      [
        [1660, 1020],
        [1250, 925],
        [900, 820],
      ],
      290,
    );
    drawRoadArm(
      [
        [830, 1660],
        [810, 1220],
        [790, 880],
      ],
      390,
    );
    drawRoadArm(
      [
        [-140, 1210],
        [310, 1040],
        [680, 855],
      ],
      310,
    );

    context.fillStyle = '#07171d';
    context.beginPath();
    context.moveTo(570, 610);
    context.lineTo(865, 550);
    context.lineTo(1085, 760);
    context.lineTo(980, 1010);
    context.lineTo(690, 1070);
    context.lineTo(470, 850);
    context.closePath();
    context.fill();

    context.strokeStyle = 'rgba(141, 163, 164, .24)';
    context.lineWidth = 7;
    context.beginPath();
    context.moveTo(0, 905);
    context.lineTo(420, 855);
    context.lineTo(565, 620);
    context.stroke();
    context.beginPath();
    context.moveTo(970, 570);
    context.lineTo(1160, 630);
    context.lineTo(1536, 700);
    context.stroke();

    context.save();
    context.filter = 'blur(28px)';
    context.globalAlpha = 0.24;
    [
      { color: '#67aeba', x: 396, y: 206, width: 38, height: 520 },
      { color: '#b46d8a', x: 1118, y: 625, width: 38, height: 390 },
      { color: '#d0a35b', x: 505, y: 980, width: 34, height: 390 },
      { color: '#79b4bd', x: 900, y: 940, width: 30, height: 440 },
    ].forEach(({ color, x, y, width, height }) => {
      context.fillStyle = color;
      context.fillRect(x, y, width, height);
    });
    context.restore();

    const drawCrosswalk = (
      x: number,
      y: number,
      rotation: number,
      count: number,
      length: number,
      spacing: number,
      opacity: number,
    ) => {
      context.save();
      context.translate(x, y);
      context.rotate(rotation);
      context.fillStyle = `rgba(184, 198, 195, ${opacity})`;
      for (let index = 0; index < count; index += 1) {
        const offset = (index - (count - 1) / 2) * spacing;
        context.fillRect(offset - 8, -length / 2, 16, length);
      }
      context.restore();
    };

    drawCrosswalk(500, 548, -2.28, 15, 222, 26, 0.55);
    drawCrosswalk(1014, 548, 2.79, 13, 190, 25, 0.52);
    drawCrosswalk(1128, 890, 1.32, 12, 184, 25, 0.5);
    drawCrosswalk(804, 1132, 0.03, 16, 252, 26, 0.58);
    drawCrosswalk(420, 986, -1.2, 13, 196, 25, 0.5);

    // The two lower-contrast diagonals read as the scramble only when the
    // viewer gets close enough, keeping the lyrics legible at first glance.
    drawCrosswalk(772, 804, -0.82, 9, 410, 29, 0.075);
    drawCrosswalk(790, 820, 0.82, 8, 385, 30, 0.06);

    context.strokeStyle = 'rgba(214, 170, 75, .54)';
    context.lineWidth = 12;
    [
      [45, 250, 350, 432],
      [1165, 930, 1512, 1015],
      [1112, 20, 1045, 300],
      [928, 1240, 945, 1512],
    ].forEach(([x1, y1, x2, y2]) => {
      context.beginPath();
      context.moveTo(x1, y1);
      context.lineTo(x2, y2);
      context.stroke();
    });

    context.fillStyle = 'rgba(190, 83, 75, .42)';
    context.fillRect(396, 382, 150, 34);
    context.fillRect(910, 1196, 154, 34);
    context.save();
    context.translate(318, 988);
    context.rotate(-1.2);
    context.fillRect(-72, -17, 144, 34);
    context.restore();
  });
  const roadMaterial = kit.meshMaterial(
    '#ffffff',
    0.98,
    true,
    roadTexture ?? undefined,
  );
  roadMaterial.alphaTest = 0.025;
  const road = kit.addMesh(
    new PlaneGeometry(18.8, 17.2),
    roadMaterial,
    [0, -3.92, -11.7],
    group,
  );
  road.rotation.x = -Math.PI / 2;

  const reflectionMaterial = kit.meshMaterial(colors.accent, 0.1);
  kit.reflectionMaterials.push(reflectionMaterial);
  [
    { x: -4.9, z: -9.2, angle: -0.18, length: 4.5 },
    { x: 4.85, z: -14.1, angle: 0.12, length: 4.8 },
    { x: -1.4, z: -11.7, angle: -0.76, length: 7.4 },
    { x: 2.25, z: -11.6, angle: 0.76, length: 6.8 },
  ].forEach(({ x, z, angle, length }, index) => {
    const reflection = kit.addMesh(
      new PlaneGeometry(0.22 + (index % 2) * 0.1, length),
      reflectionMaterial,
      [x, -3.86, z],
      group,
    );
    reflection.rotation.set(-Math.PI / 2, angle, 0);
  });

  const umbrellaMaterials = [
    kit.meshMaterial('#d2dedb', 0.48),
    kit.meshMaterial('#85aeb4', 0.44),
    kit.meshMaterial('#a66e87', 0.4),
    kit.meshMaterial(colors.signal, 0.38),
  ];
  const routes: PedestrianRoute[] = [
    { from: [-5.55, -15.35], to: [5.8, -10.25] },
    { from: [4.55, -16.15], to: [-5.8, -9.15] },
    { from: [-0.15, -16.35], to: [0.35, -5.75] },
    { from: [-6.35, -9.45], to: [6.25, -10.65] },
  ];
  const pedestrianCount = 30;
  const pedestrians = Array.from({ length: pedestrianCount }, (_, index) => {
    const route = routes[index % routes.length];
    const lane = ((index % 7) - 3) * 0.08;
    const umbrella = kit.addMesh(
      new CircleGeometry(0.085 + (index % 3) * 0.012, 20),
      umbrellaMaterials[index % umbrellaMaterials.length],
      [route.from[0], -3.65, route.from[1]],
      group,
    );
    umbrella.rotation.x = -Math.PI / 2;
    umbrella.scale.y = 0.78;

    return {
      umbrella,
      from: [route.from[0] + lane, route.from[1] - lane] as Point,
      to: [route.to[0] + lane, route.to[1] - lane] as Point,
      startOffset: 0.035 + (index % 7) * 0.012,
      endOffset: 0.67 + (index % 5) * 0.008,
    };
  });
  const signalCycleDuration = 9_800;
  let signalPhase = 0.08;
  let lastTime: number | null = null;

  return {
    group,
    resize: (compact: boolean) => {
      const planScale = compact ? 0.96 : 1.18;
      group.scale.set(planScale, 1, planScale);
      group.position.x = compact ? 0.05 : 0.12;
      group.rotation.y = compact ? 0.035 : 0.065;
    },
    update: (time: number, reducedMotion: boolean) => {
      const frameDelta =
        lastTime === null ? 0 : Math.min(Math.max(time - lastTime, 0), 48);
      lastTime = time;

      if (!reducedMotion) {
        signalPhase = (signalPhase + frameDelta / signalCycleDuration) % 1;
      }

      pedestrians.forEach((pedestrian, index) => {
        const isWalking =
          reducedMotion ||
          (signalPhase >= pedestrian.startOffset &&
            signalPhase <= pedestrian.endOffset);
        pedestrian.umbrella.visible = isWalking;
        if (!isWalking) {
          return;
        }

        const rawProgress = reducedMotion
          ? 0.5
          : Math.min(
              Math.max(
                (signalPhase - pedestrian.startOffset) /
                  (pedestrian.endOffset - pedestrian.startOffset),
                0,
              ),
              1,
            );
        const easedProgress = rawProgress * rawProgress * (3 - 2 * rawProgress);
        const directionX = pedestrian.to[0] - pedestrian.from[0];
        const directionZ = pedestrian.to[1] - pedestrian.from[1];
        const directionLength = Math.max(
          Math.hypot(directionX, directionZ),
          0.001,
        );
        const avoidance = reducedMotion
          ? 0
          : Math.sin(rawProgress * Math.PI * 4 + index * 1.7) * 0.018;
        pedestrian.umbrella.position.x =
          pedestrian.from[0] +
          directionX * easedProgress +
          (-directionZ / directionLength) * avoidance;
        pedestrian.umbrella.position.z =
          pedestrian.from[1] +
          directionZ * easedProgress +
          (directionX / directionLength) * avoidance;
        pedestrian.umbrella.position.y =
          -3.65 +
          (reducedMotion
            ? 0
            : Math.sin(rawProgress * Math.PI * 8 + index) * 0.012);
      });
    },
  };
}
