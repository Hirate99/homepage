import {
  BufferGeometry,
  CanvasTexture,
  DoubleSide,
  Group,
  InstancedMesh,
  Line,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  SRGBColorSpace,
  Texture,
  TextureLoader,
  Vector3,
} from 'three';

type Point = [number, number, number];
type SceneMaterial = MeshBasicMaterial | LineBasicMaterial;

/**
 * Shared lifecycle and construction helpers for lyric-scene environments.
 * Theme modules own composition; the kit owns WebGL resources and entrance
 * opacity so adding a song does not duplicate disposal bookkeeping.
 */
export function createSceneKit() {
  const group = new Group();
  const geometries = new Set<BufferGeometry>();
  const materials = new Set<SceneMaterial>();
  const textures = new Set<Texture>();
  const textureLoader = new TextureLoader();
  const glowMaterials: MeshBasicMaterial[] = [];
  const reflectionMaterials: MeshBasicMaterial[] = [];

  const trackGeometry = <T extends BufferGeometry>(geometry: T) => {
    geometries.add(geometry);
    return geometry;
  };

  const trackMaterial = <T extends SceneMaterial>(material: T) => {
    materials.add(material);
    return material;
  };

  const meshMaterial = (
    color: string,
    opacity: number,
    depthWrite = false,
    map?: Texture,
  ) => {
    const material = trackMaterial(
      new MeshBasicMaterial({
        color,
        ...(map ? { map } : {}),
        transparent: true,
        opacity: 0,
        depthWrite,
        side: DoubleSide,
        fog: true,
      }),
    );
    material.userData.baseOpacity = opacity;
    return material;
  };

  const lineMaterial = (color: string, opacity: number) => {
    const material = trackMaterial(
      new LineBasicMaterial({
        color,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        fog: true,
      }),
    );
    material.userData.baseOpacity = opacity;
    return material;
  };

  const addMesh = (
    geometry: BufferGeometry,
    material: MeshBasicMaterial,
    position: Point,
    parent = group,
  ) => {
    trackGeometry(geometry);
    const mesh = new Mesh(geometry, material);
    mesh.position.set(...position);
    parent.add(mesh);
    return mesh;
  };

  const addInstancedMesh = (
    geometry: BufferGeometry,
    material: MeshBasicMaterial,
    count: number,
    parent = group,
  ) => {
    trackGeometry(geometry);
    const mesh = new InstancedMesh(geometry, material, count);
    parent.add(mesh);
    return mesh;
  };

  const addLine = (
    points: Vector3[],
    material: LineBasicMaterial,
    parent = group,
  ) => {
    const geometry = trackGeometry(new BufferGeometry().setFromPoints(points));
    const line = new Line(geometry, material);
    parent.add(line);
    return line;
  };

  const addLineSegments = (
    points: Vector3[],
    material: LineBasicMaterial,
    parent = group,
  ) => {
    const geometry = trackGeometry(new BufferGeometry().setFromPoints(points));
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

  const loadTexture = (url: string) => {
    const texture = textureLoader.load(url);
    texture.colorSpace = SRGBColorSpace;
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
    addInstancedMesh,
    addLine,
    addLineSegments,
    createTexture,
    loadTexture,
    applyEntrance,
    dispose,
  };
}

export type SceneKit = ReturnType<typeof createSceneKit>;
