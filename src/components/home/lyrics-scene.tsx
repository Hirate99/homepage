'use client';

import { useEffect, useRef } from 'react';

import {
  BufferGeometry,
  CanvasTexture,
  Color,
  Fog,
  Group,
  LinearFilter,
  Line,
  LineBasicMaterial,
  LineSegments,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Raycaster,
  RingGeometry,
  Scene,
  SRGBColorSpace,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';

import { notoSerif } from '@/fonts';

import { Lyrics } from './lyrics.data';

interface LyricLayout {
  x: number;
  y: number;
  z: number;
  rotation: number;
  rotationX: number;
  rotationY: number;
  size: number;
  color: string;
  opacity: number;
}

interface LyricMeshData {
  index: number;
  baseX: number;
  baseY: number;
  baseZ: number;
  baseRotation: number;
  baseRotationX: number;
  baseRotationY: number;
  baseOpacity: number;
  phase: number;
}

type LyricMesh = Mesh<PlaneGeometry, MeshBasicMaterial> & {
  userData: LyricMeshData;
};

const lyricFragments = Array.from(
  new Set(Lyrics.split(/\n+/).filter(Boolean)),
).slice(0, 15);

const lyricColors = ['#c94825', '#df6037', '#e98968', '#edaf96'];

const lyricLayout: LyricLayout[] = lyricFragments.map((_, index) => {
  const angle = index * 1.16 + 0.35;
  const depth = -index * 0.62 - (index % 3) * 0.35;
  const radiusX = 4.35 + Math.sin(index * 0.7) * 0.55;
  const radiusY = 3.25 + Math.cos(index * 0.45) * 0.35;

  return {
    x: Math.cos(angle) * radiusX,
    y: Math.sin(angle) * radiusY,
    z: depth,
    rotation: Math.sin(angle) * 0.08,
    rotationX: -Math.sin(angle) * 0.11,
    rotationY: Math.cos(angle) * 0.24,
    size: 0.72 + (index % 4) * 0.09,
    color: lyricColors[index % lyricColors.length],
    opacity: 0.7 - Math.min(index * 0.018, 0.28),
  };
});

const mobileLyricPositions: Record<
  number,
  { x: number; y: number; z: number; rotation: number }
> = {
  0: { x: 1.25, y: 2.9, z: -0.5, rotation: -0.04 },
  1: { x: 1.25, y: 1.6, z: -0.2, rotation: 0.045 },
  2: { x: 0, y: -0.4, z: -0.5, rotation: -0.02 },
  5: { x: -1.5, y: -1.4, z: -0.45, rotation: -0.045 },
  6: { x: 1.45, y: -2.25, z: -0.2, rotation: 0.065 },
  7: { x: 0, y: -3.1, z: -0.65, rotation: 0 },
};

const mobileLyricOrder = Object.keys(mobileLyricPositions).map(Number);

function createTunnelLines() {
  const material = new LineBasicMaterial({
    color: '#cf5a36',
    transparent: true,
    opacity: 0.14,
  });
  const lines: Array<Line<BufferGeometry, LineBasicMaterial>> = [];
  const corners = [
    [-5.2, -3.75],
    [5.2, -3.75],
    [5.2, 3.75],
    [-5.2, 3.75],
  ];

  corners.forEach(([x, y]) => {
    const geometry = new BufferGeometry().setFromPoints([
      new Vector3(x, y, 1.8),
      new Vector3(x * 0.42, y * 0.42, -13),
    ]);
    lines.push(new Line(geometry, material));
  });

  [-1.4, -4.6, -7.8, -11].forEach((z) => {
    const depthProgress = (1.8 - z) / 14.8;
    const scale = 1 - depthProgress * 0.58;
    const geometry = new BufferGeometry().setFromPoints([
      new Vector3(-5.2 * scale, -3.75 * scale, z),
      new Vector3(5.2 * scale, -3.75 * scale, z),
      new Vector3(5.2 * scale, 3.75 * scale, z),
      new Vector3(-5.2 * scale, 3.75 * scale, z),
      new Vector3(-5.2 * scale, -3.75 * scale, z),
    ]);
    lines.push(new Line(geometry, material));
  });

  return { lines, material };
}

function createBackdropGrid() {
  const points: Vector3[] = [];

  for (let x = -5; x <= 5; x += 0.9) {
    points.push(new Vector3(x, -9, -3.4), new Vector3(x, 9, -3.4));
  }
  for (let y = -9; y <= 9; y += 0.9) {
    points.push(new Vector3(-5, y, -3.4), new Vector3(5, y, -3.4));
  }

  const geometry = new BufferGeometry().setFromPoints(points);
  const material = new LineBasicMaterial({
    color: '#d56848',
    transparent: true,
    opacity: 0.075,
    depthWrite: false,
    fog: false,
  });
  const lines = new LineSegments(geometry, material);
  lines.rotation.z = -0.035;
  lines.visible = false;

  return { lines, geometry, material };
}

function createLyricMesh(
  text: string,
  index: number,
  layout: LyricLayout,
  fontFamily: string,
) {
  const fontSize = 86;
  const paddingX = 40;
  const paddingY = 28;
  const pixelRatio = 2;
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Unable to create lyric texture context.');
  }

  context.font = `600 ${fontSize}px ${fontFamily}`;
  const textWidth = Math.ceil(context.measureText(text).width);
  const logicalWidth = textWidth + paddingX * 2;
  const logicalHeight = fontSize + paddingY * 2;

  canvas.width = logicalWidth * pixelRatio;
  canvas.height = logicalHeight * pixelRatio;
  context.scale(pixelRatio, pixelRatio);
  context.font = `600 ${fontSize}px ${fontFamily}`;
  context.fillStyle = '#ffffff';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(text, logicalWidth / 2, logicalHeight / 2 + 2);

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.minFilter = LinearFilter;
  texture.magFilter = LinearFilter;

  const height = layout.size;
  const width = (logicalWidth / logicalHeight) * height;
  const geometry = new PlaneGeometry(width, height, 48, 4);
  const material = new MeshBasicMaterial({
    map: texture,
    color: new Color(layout.color),
    transparent: true,
    opacity: layout.opacity,
    depthWrite: false,
  });
  material.userData.lyricWave = {
    strength: { value: 0 },
    phase: { value: 0 },
  };
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uLyricWaveStrength = material.userData.lyricWave.strength;
    shader.uniforms.uLyricWavePhase = material.userData.lyricWave.phase;
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform float uLyricWaveStrength;
        uniform float uLyricWavePhase;`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        float lyricWaveEnvelope = sin(uv.x * 3.14159265);
        float lyricWave = sin(uv.x * 15.0 - uLyricWavePhase) * lyricWaveEnvelope;
        transformed.z += lyricWave * uLyricWaveStrength * 0.14;
        transformed.y += cos(uv.x * 10.0 - uLyricWavePhase * 0.82) * lyricWaveEnvelope * uLyricWaveStrength * 0.045;`,
      );
  };
  material.customProgramCacheKey = () => 'lyric-wave-v1';
  const mesh = new Mesh(geometry, material) as LyricMesh;

  mesh.position.set(layout.x, layout.y, layout.z);
  mesh.rotation.x = layout.rotationX;
  mesh.rotation.y = layout.rotationY;
  mesh.rotation.z = layout.rotation;
  mesh.userData = {
    index,
    baseX: layout.x,
    baseY: layout.y,
    baseZ: layout.z,
    baseRotation: layout.rotation,
    baseRotationX: layout.rotationX,
    baseRotationY: layout.rotationY,
    baseOpacity: layout.opacity,
    phase: index * 0.83,
  };

  return mesh;
}

export function LyricsScene() {
  const containerRef = useRef<HTMLDivElement>(null);
  const fontProbeRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    let disposed = false;
    let cleanup = () => {};

    const initialize = async () => {
      await document.fonts.ready;
      if (disposed || !containerRef.current) {
        return;
      }

      const fontFamily = fontProbeRef.current
        ? window.getComputedStyle(fontProbeRef.current).fontFamily
        : 'serif';
      const scene = new Scene();
      scene.background = new Color('#f4efe3');
      scene.fog = new Fog('#f4efe3', 12, 28);
      const camera = new PerspectiveCamera(43, 1, 0.1, 100);
      camera.position.set(0, 0, 12);

      const renderer = new WebGLRenderer({
        antialias: true,
        alpha: false,
        preserveDrawingBuffer: true,
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.domElement.dataset.lyricsCanvas = 'true';
      renderer.domElement.setAttribute(
        'aria-label',
        'Interactive three-dimensional Japanese lyric sculpture',
      );
      renderer.domElement.setAttribute('role', 'img');
      renderer.domElement.className = 'absolute inset-0 h-full w-full';
      containerRef.current.appendChild(renderer.domElement);

      const lyricGroup = new Group();
      scene.add(lyricGroup);

      const backdropGrid = createBackdropGrid();
      scene.add(backdropGrid.lines);

      const tunnel = createTunnelLines();
      tunnel.lines.forEach((line) => lyricGroup.add(line));

      const meshes = lyricFragments.map((text, index) => {
        const mesh = createLyricMesh(
          text,
          index,
          lyricLayout[index],
          fontFamily,
        );
        lyricGroup.add(mesh);
        return mesh;
      });
      const lyricEchoes = meshes.map((mesh) => {
        const colors = ['#ec6138', '#77a89d'];

        return colors.map((color, echoIndex) => {
          const material = new MeshBasicMaterial({
            map: mesh.material.map,
            color,
            transparent: true,
            opacity: 0,
            depthWrite: false,
          });
          const echo = new Mesh(mesh.geometry, material);
          echo.renderOrder = 8 - echoIndex;
          lyricGroup.add(echo);
          return echo;
        });
      });
      meshes.forEach((mesh) => {
        mesh.renderOrder = 10;
      });

      const rippleGeometry = new RingGeometry(0.92, 1, 96);
      const rippleRings = ['#d84d29', '#77a89d', '#173a32', '#ec8967'].map(
        (color, index) => {
          const material = new MeshBasicMaterial({
            color,
            transparent: true,
            opacity: 0,
            depthWrite: false,
            depthTest: false,
            fog: false,
          });
          const ring = new Mesh(rippleGeometry, material);
          ring.visible = false;
          ring.renderOrder = 12 - index;
          lyricGroup.add(ring);
          return ring;
        },
      );

      const pointer = new Vector2(0, 0);
      const pointerTarget = new Vector2(0, 0);
      const raycaster = new Raycaster();
      const activeColor = new Color('#173a32');
      const idleColors = lyricLayout.map((item) => new Color(item.color));
      let hoveredIndex: number | null = null;
      let rippleIndex: number | null = null;
      let rippleStartedAt = Number.NEGATIVE_INFINITY;
      const rippleOrigin = new Vector3();
      let hasStartedAnimation = false;
      let entranceStartedAt = 0;
      let frameId = 0;

      const hitTest = (event: PointerEvent) => {
        if (!containerRef.current) {
          return null;
        }

        const rect = containerRef.current.getBoundingClientRect();
        pointerTarget.set(
          ((event.clientX - rect.left) / rect.width) * 2 - 1,
          -((event.clientY - rect.top) / rect.height) * 2 + 1,
        );
        raycaster.setFromCamera(pointerTarget, camera);
        const hit = raycaster.intersectObjects(
          meshes.filter((mesh) => mesh.visible),
          false,
        )[0];

        return hit ? (hit.object as LyricMesh).userData.index : null;
      };

      const resize = () => {
        if (!containerRef.current) {
          return;
        }

        const width = containerRef.current.clientWidth;
        const height = containerRef.current.clientHeight;
        const aspect = width / Math.max(height, 1);

        renderer.setSize(width, height, false);
        camera.aspect = aspect;
        camera.fov = aspect < 0.72 ? 55 : 43;
        camera.updateProjectionMatrix();

        const isCompact = aspect < 0.72;
        const compactScale = isCompact ? 0.82 : aspect < 1 ? 0.84 : 1;
        lyricGroup.scale.set(compactScale, compactScale, compactScale);
        tunnel.lines.forEach((line) => {
          line.visible = !isCompact;
        });
        backdropGrid.lines.visible = isCompact;

        meshes.forEach((mesh, index) => {
          const desktopLayout = lyricLayout[index];
          const mobilePosition = mobileLyricPositions[index];
          const isVisible = !isCompact || Boolean(mobilePosition);

          mesh.visible = isVisible;
          lyricEchoes[index].forEach((echo) => {
            echo.visible = isVisible;
          });
          mesh.userData.baseX = isCompact
            ? (mobilePosition?.x ?? desktopLayout.x)
            : desktopLayout.x;
          mesh.userData.baseY = isCompact
            ? (mobilePosition?.y ?? desktopLayout.y)
            : desktopLayout.y;
          mesh.userData.baseZ = isCompact
            ? (mobilePosition?.z ?? desktopLayout.z)
            : desktopLayout.z;
          mesh.userData.baseRotation = isCompact
            ? (mobilePosition?.rotation ?? desktopLayout.rotation * 0.32)
            : desktopLayout.rotation;
          mesh.userData.baseRotationX = isCompact
            ? desktopLayout.rotationX * 0.3
            : desktopLayout.rotationX;
          mesh.userData.baseRotationY = isCompact
            ? desktopLayout.rotationY * 0.35
            : desktopLayout.rotationY;
          mesh.userData.baseOpacity = isCompact
            ? Math.max(desktopLayout.opacity, 0.78)
            : desktopLayout.opacity;
          if (!hasStartedAnimation) {
            mesh.position.set(
              mesh.userData.baseX,
              mesh.userData.baseY,
              mesh.userData.baseZ,
            );
            mesh.rotation.set(
              mesh.userData.baseRotationX,
              mesh.userData.baseRotationY,
              mesh.userData.baseRotation,
            );
            mesh.scale.setScalar(isCompact ? 1.18 : 1);
          }
        });
      };

      const updatePointer = (event: PointerEvent) => {
        if (!containerRef.current) {
          return;
        }

        const rect = containerRef.current.getBoundingClientRect();
        const isInside =
          event.clientX >= rect.left &&
          event.clientX <= rect.right &&
          event.clientY >= rect.top &&
          event.clientY <= rect.bottom;

        const target = event.target as HTMLElement | null;
        if (!isInside || target?.closest('a, button')) {
          hoveredIndex = null;
          pointerTarget.set(0, 0);
          return;
        }

        hoveredIndex = hitTest(event);
      };

      const triggerRipple = (event: PointerEvent) => {
        const target = event.target as HTMLElement | null;
        if (target?.closest('a, button')) {
          return;
        }

        const hitIndex = hitTest(event);
        if (hitIndex === null) {
          return;
        }

        hoveredIndex = hitIndex;
        rippleIndex = hitIndex;
        rippleStartedAt = performance.now();
        const data = meshes[hitIndex].userData;
        rippleOrigin.set(data.baseX, data.baseY, data.baseZ + 0.06);
      };

      const prefersReducedMotion = window.matchMedia(
        '(prefers-reduced-motion: reduce)',
      );

      const animate = (time: number) => {
        const reducedMotion = prefersReducedMotion.matches;
        pointer.lerp(pointerTarget, reducedMotion ? 1 : 0.065);
        const entranceElapsed = time - entranceStartedAt;
        const backdropEntrance = reducedMotion
          ? 1
          : MathUtils.clamp(entranceElapsed / 900, 0, 1);
        backdropGrid.material.opacity = backdropEntrance * 0.075;
        tunnel.material.opacity = backdropEntrance * 0.14;

        const rippleAge = time - rippleStartedAt;
        const isRippleActive =
          rippleIndex !== null && rippleAge >= 0 && rippleAge < 1800;
        if (rippleIndex !== null && rippleAge >= 1800) {
          rippleIndex = null;
        }
        const visualRippleAge = isRippleActive
          ? reducedMotion
            ? 650
            : rippleAge
          : 0;
        const activeIndex = isRippleActive ? rippleIndex : hoveredIndex;
        renderer.domElement.dataset.activeLyric =
          activeIndex === null ? '' : String(activeIndex);
        renderer.domElement.dataset.lyricMode = isRippleActive
          ? 'ripple'
          : hoveredIndex !== null
            ? 'hovered'
            : 'idle';
        renderer.domElement.style.cursor =
          hoveredIndex !== null ? 'pointer' : 'default';

        rippleRings.forEach((ring, index) => {
          const progress = MathUtils.clamp(
            (visualRippleAge - index * 115) / 1180,
            0,
            1,
          );
          const isVisible = isRippleActive && progress > 0 && progress < 1;
          ring.visible = isVisible;
          if (!isVisible) {
            ring.material.opacity = 0;
            return;
          }

          const easedProgress = 1 - Math.pow(1 - progress, 3);
          ring.position.copy(rippleOrigin);
          ring.position.z += index * 0.045;
          ring.scale.setScalar(0.12 + easedProgress * 4.8);
          ring.material.opacity =
            Math.sin(progress * Math.PI) * (0.34 - index * 0.045);
        });

        lyricGroup.rotation.x = MathUtils.lerp(
          lyricGroup.rotation.x,
          reducedMotion || camera.aspect < 0.72 ? 0 : -pointer.y * 0.16,
          0.07,
        );
        lyricGroup.rotation.y = MathUtils.lerp(
          lyricGroup.rotation.y,
          reducedMotion || camera.aspect < 0.72 ? 0 : pointer.x * 0.24,
          0.07,
        );
        lyricGroup.rotation.z = reducedMotion
          ? 0
          : Math.sin(time * 0.00016) * 0.018;
        lyricGroup.position.z = reducedMotion
          ? 0
          : Math.sin(time * 0.00022) * 0.24;

        meshes.forEach((mesh, index) => {
          const data = mesh.userData;
          const isActive = index === activeIndex;
          const isHovered = index === hoveredIndex && !isRippleActive;
          const mobileOrder = mobileLyricOrder.indexOf(index);
          const entranceOrder =
            camera.aspect < 0.72 ? Math.max(mobileOrder, 0) : index;
          const entranceProgress = reducedMotion
            ? 1
            : MathUtils.clamp(
                (entranceElapsed - entranceOrder * 70) / 720,
                0,
                1,
              );
          const entranceEase = 1 - Math.pow(1 - entranceProgress, 3);
          const entranceOffset = 1 - entranceEase;
          const floatY = reducedMotion
            ? 0
            : Math.sin(time * 0.00055 + data.phase) * 0.1;
          const floatX = reducedMotion
            ? 0
            : Math.cos(time * 0.00037 + data.phase) * 0.06;
          const deltaX = data.baseX - rippleOrigin.x;
          const deltaY = data.baseY - rippleOrigin.y;
          const deltaZ = (data.baseZ - rippleOrigin.z) * 0.45;
          const distanceFromRipple = Math.hypot(deltaX, deltaY, deltaZ);
          const rippleProgress = MathUtils.clamp(visualRippleAge / 1450, 0, 1);
          const waveRadius = rippleProgress * 8.5;
          const waveOffset = distanceFromRipple - waveRadius;
          const waveStrength = isRippleActive
            ? Math.exp(-Math.pow(waveOffset / 0.62, 2))
            : 0;
          const directionLength = Math.max(Math.hypot(deltaX, deltaY), 0.001);
          const targetX =
            data.baseX +
            floatX +
            (deltaX / directionLength) * waveStrength * 0.1 +
            (index % 2 === 0 ? -1 : 1) * entranceOffset * 0.38;
          const targetY =
            data.baseY +
            floatY +
            (deltaY / directionLength) * waveStrength * 0.1 +
            entranceOffset * 0.18;
          const targetZ =
            data.baseZ + waveStrength * 0.28 - entranceOffset * 2.2;
          const targetOpacity =
            (isActive ? 1 : data.baseOpacity) * entranceEase;
          const targetTextScale = camera.aspect < 0.72 ? 1.18 : 1;
          const clickedWaveProgress = MathUtils.clamp(
            visualRippleAge / 1450,
            0,
            1,
          );
          const clickedWaveStrength =
            isRippleActive && index === rippleIndex
              ? Math.sin(clickedWaveProgress * Math.PI)
              : 0;
          const entranceWaveStrength = reducedMotion
            ? 0
            : Math.sin(entranceProgress * Math.PI) * 0.22;
          const lyricWaveStrength = Math.max(
            clickedWaveStrength,
            waveStrength * 0.68,
            entranceWaveStrength,
          );
          const lyricWaveUniforms = mesh.material.userData.lyricWave as {
            strength: { value: number };
            phase: { value: number };
          };
          lyricWaveUniforms.strength.value = MathUtils.lerp(
            lyricWaveUniforms.strength.value,
            lyricWaveStrength,
            reducedMotion ? 1 : 0.18,
          );
          lyricWaveUniforms.phase.value =
            visualRippleAge * 0.018 - distanceFromRipple * 1.4;

          mesh.position.x = MathUtils.lerp(mesh.position.x, targetX, 0.07);
          mesh.position.y = MathUtils.lerp(mesh.position.y, targetY, 0.07);
          mesh.position.z = MathUtils.lerp(mesh.position.z, targetZ, 0.08);
          mesh.scale.x = MathUtils.lerp(mesh.scale.x, targetTextScale, 0.09);
          mesh.scale.y = MathUtils.lerp(mesh.scale.y, targetTextScale, 0.09);
          mesh.rotation.z = MathUtils.lerp(
            mesh.rotation.z,
            data.baseRotation + waveStrength * (deltaX >= 0 ? 0.035 : -0.035),
            0.08,
          );
          mesh.rotation.x = MathUtils.lerp(
            mesh.rotation.x,
            data.baseRotationX - waveStrength * 0.035,
            0.08,
          );
          mesh.rotation.y = MathUtils.lerp(
            mesh.rotation.y,
            data.baseRotationY + waveStrength * 0.045,
            0.08,
          );
          mesh.material.opacity = MathUtils.lerp(
            mesh.material.opacity,
            targetOpacity,
            0.08,
          );
          mesh.material.color.lerp(
            isActive ? activeColor : idleColors[index],
            0.08,
          );

          lyricEchoes[index].forEach((echo, echoIndex) => {
            const direction = echoIndex === 0 ? -1 : 1;
            echo.position.copy(mesh.position);
            echo.position.x += direction * (0.09 + Math.abs(pointer.x) * 0.05);
            echo.position.y += direction * 0.035;
            echo.position.z -= (echoIndex + 1) * 0.28;
            echo.rotation.copy(mesh.rotation);
            echo.scale.copy(mesh.scale);
            echo.material.opacity = MathUtils.lerp(
              echo.material.opacity,
              isActive && isRippleActive
                ? waveStrength * (0.3 - echoIndex * 0.09)
                : isHovered
                  ? 0.16 - echoIndex * 0.055
                  : 0,
              0.12,
            );
          });
        });

        renderer.render(scene, camera);
        frameId = window.requestAnimationFrame(animate);
      };

      const resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(containerRef.current);
      window.addEventListener('pointermove', updatePointer, { passive: true });
      window.addEventListener('pointerdown', triggerRipple);
      resize();
      meshes.forEach((mesh, index) => {
        if (prefersReducedMotion.matches) {
          mesh.material.opacity = mesh.userData.baseOpacity;
          return;
        }

        mesh.position.x += index % 2 === 0 ? -0.38 : 0.38;
        mesh.position.y += 0.18;
        mesh.position.z -= 2.2;
        mesh.material.opacity = 0;
      });
      tunnel.material.opacity = prefersReducedMotion.matches ? 0.14 : 0;
      backdropGrid.material.opacity = prefersReducedMotion.matches ? 0.075 : 0;
      entranceStartedAt = performance.now();
      hasStartedAnimation = true;
      frameId = window.requestAnimationFrame(animate);

      cleanup = () => {
        window.cancelAnimationFrame(frameId);
        resizeObserver.disconnect();
        window.removeEventListener('pointermove', updatePointer);
        window.removeEventListener('pointerdown', triggerRipple);
        meshes.forEach((mesh) => {
          mesh.geometry.dispose();
          mesh.material.map?.dispose();
          mesh.material.dispose();
        });
        lyricEchoes.flat().forEach((echo) => echo.material.dispose());
        rippleGeometry.dispose();
        rippleRings.forEach((ring) => ring.material.dispose());
        backdropGrid.geometry.dispose();
        backdropGrid.material.dispose();
        tunnel.lines.forEach((line) => line.geometry.dispose());
        tunnel.material.dispose();
        renderer.dispose();
        renderer.forceContextLoss();
        renderer.domElement.remove();
      };
    };

    void initialize();

    return () => {
      disposed = true;
      cleanup();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 overflow-hidden bg-[#f4efe3]"
    >
      <span
        ref={fontProbeRef}
        className={`${notoSerif.className} pointer-events-none absolute opacity-0`}
        aria-hidden="true"
      >
        青い、濃い、橙色の日
      </span>
    </div>
  );
}
