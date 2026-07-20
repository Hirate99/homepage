import { BoxGeometry, CylinderGeometry, Group, PlaneGeometry } from 'three';

import type { SongColors } from '../../../songs/types';

import type { SceneKit } from '../scene-kit';

interface BuildingDefinition {
  x: number;
  z: number;
  width: number;
  height: number;
  depth: number;
  rotation: number;
  billboard?: {
    colors: [string, string];
    width: number;
    height: number;
    headline: string;
    subline: string;
    label: string;
    footer: string;
  };
}

export function createRainCity(kit: SceneKit, colors: SongColors) {
  const group = new Group();
  kit.group.add(group);

  const buildingMaterials = [
    kit.meshMaterial('#06131a', 0.99, true),
    kit.meshMaterial('#0a1c24', 0.98, true),
    kit.meshMaterial('#102831', 0.94, true),
    kit.meshMaterial('#172d34', 0.9, true),
  ];
  const rooftopMaterial = kit.meshMaterial('#263940', 0.86, true);
  const rooftopHighlightMaterial = kit.meshMaterial('#6b8184', 0.25);
  const windowMaterials = [
    kit.meshMaterial('#79aeb4', 0.28),
    kit.meshMaterial(colors.signal, 0.34),
    kit.meshMaterial('#a46f88', 0.22),
  ];
  kit.glowMaterials.push(...windowMaterials);

  // The masses follow the irregular pockets around the crossing: station and
  // Hachiko side below, MAGNET at the west corner, QFRONT on the east, and the
  // narrow Center-gai / Dogenzaka blocks closing the far edge.
  const buildings: BuildingDefinition[] = [
    {
      x: -9.8,
      z: -14.1,
      width: 3.8,
      height: 6.6,
      depth: 3,
      rotation: 0.29,
      billboard: {
        colors: ['rgba(32, 111, 128, .96)', 'rgba(230, 184, 101, .92)'],
        width: 0.64,
        height: 0.4,
        headline: '雨',
        subline: '君の生活のことをおもう',
        label: '羊文学',
        footer: '雨のにおいがする',
      },
    },
    {
      x: -2.25,
      z: -21.1,
      width: 5.2,
      height: 7.2,
      depth: 3.15,
      rotation: -0.05,
    },
    {
      x: 8.25,
      z: -17.25,
      width: 4.8,
      height: 7.8,
      depth: 3.35,
      rotation: 0.17,
      billboard: {
        colors: ['rgba(42, 128, 150, .94)', 'rgba(176, 79, 119, .9)'],
        width: 0.72,
        height: 0.48,
        headline: '光',
        subline: '光が揺れてる',
        label: '夜だけ見える',
        footer: '窓から見える',
      },
    },
  ];
  const billboardScans: Array<{
    mesh: ReturnType<SceneKit['addMesh']>;
    centerY: number;
    travel: number;
    phase: number;
  }> = [];

  const createBillboardMaterial = (
    billboard: NonNullable<BuildingDefinition['billboard']>,
  ) => {
    const [color, signal] = billboard.colors;
    const texture = kit.createTexture(640, 800, (context) => {
      context.fillStyle = '#071116';
      context.fillRect(0, 0, 640, 800);
      context.fillStyle = color;
      context.fillRect(28, 28, 584, 744);

      context.fillStyle = 'rgba(4, 15, 20, .5)';
      context.fillRect(28, 28, 584, 744);
      context.fillStyle = signal;
      context.fillRect(52, 54, 10, 692);
      context.fillRect(86, 680, 470, 5);

      context.fillStyle = 'rgba(229, 241, 237, .78)';
      context.font = '600 28px sans-serif';
      context.textAlign = 'left';
      context.fillText(billboard.label, 88, 104);

      context.save();
      context.shadowColor = signal;
      context.shadowBlur = 24;
      context.fillStyle = '#edf6f2';
      context.font =
        billboard.headline.length === 1
          ? '700 330px "Noto Serif JP", serif'
          : '700 170px "Noto Serif JP", serif';
      context.textBaseline = 'middle';
      context.fillText(billboard.headline, 78, 402);
      context.restore();

      context.fillStyle = 'rgba(237, 246, 242, .86)';
      context.font = '600 27px "Noto Serif JP", serif';
      context.textAlign = 'center';
      Array.from(billboard.subline)
        .slice(0, 12)
        .forEach((character, index) => {
          context.fillText(character, 548, 174 + index * 40);
        });

      context.fillStyle = signal;
      context.fillRect(88, 606, 220, 9);
      context.fillStyle = 'rgba(237, 246, 242, .56)';
      context.font = '600 19px "Noto Serif JP", serif';
      context.textAlign = 'left';
      context.fillText(billboard.footer, 88, 652);

      context.strokeStyle = 'rgba(225, 239, 233, .45)';
      context.lineWidth = 7;
      context.strokeRect(28, 28, 584, 744);
      context.strokeStyle = 'rgba(225, 239, 233, .12)';
      context.lineWidth = 2;
      for (let x = 88; x < 540; x += 56) {
        context.beginPath();
        context.moveTo(x, 154);
        context.lineTo(x, 654);
        context.stroke();
      }
    });
    if (!texture) {
      return null;
    }

    const material = kit.meshMaterial('#ffffff', 0.66, false, texture);
    kit.glowMaterials.push(material);
    return material;
  };

  buildings.forEach((building, buildingIndex) => {
    const buildingGroup = new Group();
    buildingGroup.position.set(
      building.x,
      -4 + building.height / 2,
      building.z,
    );
    buildingGroup.rotation.y = building.rotation;
    group.add(buildingGroup);

    kit.addMesh(
      new BoxGeometry(building.width, building.height, building.depth),
      buildingMaterials[buildingIndex % buildingMaterials.length],
      [0, 0, 0],
      buildingGroup,
    );

    const columns = Math.max(4, Math.floor(building.width / 0.72));
    const rows = Math.max(3, Math.min(8, Math.floor(building.height / 0.92)));
    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        if ((row * 2 + column + buildingIndex) % 4 === 0) {
          continue;
        }
        kit.addMesh(
          new PlaneGeometry(0.31, 0.24),
          windowMaterials[(row + column + buildingIndex) % 3],
          [
            (column - (columns - 1) / 2) * 0.58,
            -building.height / 2 + 0.64 + row * 0.78,
            building.depth / 2 + 0.012,
          ],
          buildingGroup,
        );
      }
    }

    kit.addMesh(
      new BoxGeometry(building.width * 0.9, 0.13, building.depth * 0.8),
      rooftopMaterial,
      [0, building.height / 2 + 0.065, 0],
      buildingGroup,
    );
    [-0.24, 0.22].forEach((offset, unitIndex) => {
      kit.addMesh(
        new BoxGeometry(
          building.width * (unitIndex === 0 ? 0.2 : 0.15),
          0.18 + (buildingIndex % 2) * 0.05,
          building.depth * 0.22,
        ),
        unitIndex === 0 ? rooftopMaterial : rooftopHighlightMaterial,
        [
          building.width * offset,
          building.height / 2 + 0.18,
          building.depth * (unitIndex === 0 ? -0.12 : 0.15),
        ],
        buildingGroup,
      );
    });
    if (buildingIndex % 2 === 1) {
      kit.addMesh(
        new CylinderGeometry(0.15, 0.18, 0.24, 18),
        rooftopHighlightMaterial,
        [
          building.width * 0.08,
          building.height / 2 + 0.25,
          -building.depth * 0.16,
        ],
        buildingGroup,
      );
    }

    if (building.billboard) {
      const billboardMaterial = createBillboardMaterial(building.billboard);
      if (billboardMaterial) {
        const billboardWidth = building.width * building.billboard.width;
        const billboardHeight = building.height * building.billboard.height;
        const billboardY = Math.min(
          building.height * 0.18,
          building.height / 2 - 1.35,
        );
        kit.addMesh(
          new PlaneGeometry(billboardWidth, billboardHeight),
          billboardMaterial,
          [0, billboardY, building.depth / 2 + 0.024],
          buildingGroup,
        );
        const scanMaterial = kit.meshMaterial(
          building.billboard.colors[1],
          0.16,
        );
        kit.glowMaterials.push(scanMaterial);
        const scan = kit.addMesh(
          new PlaneGeometry(billboardWidth * 0.88, 0.028),
          scanMaterial,
          [0, billboardY, building.depth / 2 + 0.03],
          buildingGroup,
        );
        billboardScans.push({
          mesh: scan,
          centerY: billboardY,
          travel: billboardHeight * 0.42,
          phase: buildingIndex * 0.37,
        });
      }
    }
  });

  return {
    group,
    resize: (compact: boolean) => {
      const planScale = compact ? 0.94 : 1;
      group.scale.set(planScale, 1, planScale);
      group.position.x = compact ? 0 : 0.05;
      group.rotation.y = compact ? 0.02 : 0.035;
    },
    update: (time: number, reducedMotion: boolean) => {
      billboardScans.forEach((scan) => {
        const progress = reducedMotion
          ? 0.5
          : (time * 0.000085 + scan.phase) % 1;
        scan.mesh.position.y = scan.centerY + scan.travel * (1 - progress * 2);
      });
    },
  };
}
