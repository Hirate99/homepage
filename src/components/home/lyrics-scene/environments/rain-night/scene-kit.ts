import {
  BufferGeometry,
  CanvasTexture,
  DoubleSide,
  Group,
  Line,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  SRGBColorSpace,
  Vector3,
} from 'three';

type Point = [number, number, number];

export function createRainSceneKit() {
  const group = new Group();
  const geometries = new Set<BufferGeometry>();
  const materials = new Set<MeshBasicMaterial | LineBasicMaterial>();
  const textures = new Set<CanvasTexture>();
  const glowMaterials: MeshBasicMaterial[] = [];
  const reflectionMaterials: MeshBasicMaterial[] = [];

  const meshMaterial = (
    color: string,
    opacity: number,
    depthWrite = false,
    map?: CanvasTexture,
  ) => {
    const material = new MeshBasicMaterial({
      color,
      ...(map ? { map } : {}),
      transparent: true,
      opacity: 0,
      depthWrite,
      side: DoubleSide,
      fog: true,
    });
    material.userData.baseOpacity = opacity;
    materials.add(material);
    return material;
  };

  const lineMaterial = (color: string, opacity: number) => {
    const material = new LineBasicMaterial({
      color,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      fog: true,
    });
    material.userData.baseOpacity = opacity;
    materials.add(material);
    return material;
  };

  const addMesh = (
    geometry: BufferGeometry,
    material: MeshBasicMaterial,
    position: Point,
    parent = group,
  ) => {
    geometries.add(geometry);
    const mesh = new Mesh(geometry, material);
    mesh.position.set(...position);
    parent.add(mesh);
    return mesh;
  };

  const addLine = (
    points: Vector3[],
    material: LineBasicMaterial,
    parent = group,
  ) => {
    const geometry = new BufferGeometry().setFromPoints(points);
    geometries.add(geometry);
    const line = new Line(geometry, material);
    parent.add(line);
    return line;
  };

  const addLineSegments = (
    points: Vector3[],
    material: LineBasicMaterial,
    parent = group,
  ) => {
    const geometry = new BufferGeometry().setFromPoints(points);
    geometries.add(geometry);
    const lines = new LineSegments(geometry, material);
    parent.add(lines);
    return lines;
  };

  const createTexture = (
    width: number,
    height: number,
    draw: (context: CanvasRenderingContext2D) => void,
  ) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) {
      return null;
    }

    draw(context);
    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    texture.needsUpdate = true;
    textures.add(texture);
    return texture;
  };

  const applyEntrance = (entrance: number) => {
    materials.forEach((material) => {
      const baseOpacity = material.userData.baseOpacity as number | undefined;
      if (baseOpacity !== undefined) {
        material.opacity = baseOpacity * entrance;
      }
    });
  };

  const dispose = () => {
    geometries.forEach((geometry) => geometry.dispose());
    materials.forEach((material) => material.dispose());
    textures.forEach((texture) => texture.dispose());
  };

  return {
    group,
    glowMaterials,
    reflectionMaterials,
    meshMaterial,
    lineMaterial,
    addMesh,
    addLine,
    addLineSegments,
    createTexture,
    applyEntrance,
    dispose,
  };
}

export type RainSceneKit = ReturnType<typeof createRainSceneKit>;
