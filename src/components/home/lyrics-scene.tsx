'use client';

import { useEffect, useRef } from 'react';

import {
  Color,
  Fog,
  Group,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  Raycaster,
  RingGeometry,
  Scene,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';

import { notoSerif } from '@/fonts';

import { createMobileLayout, getLyricCues } from './lyrics-scene/layout';
import { createLyricMesh } from './lyrics-scene/lyric-mesh';
import { createAtmosphere } from './lyrics-scene/scene-objects';
import { getSongSceneTheme } from './lyrics-scene/themes';
import type { LyricMesh } from './lyrics-scene/types';
import type { SongDefinition } from './songs';

export function LyricsScene({ song }: { song: SongDefinition }) {
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
      await Promise.race([
        document.fonts.ready,
        new Promise((resolve) => window.setTimeout(resolve, 240)),
      ]);
      if (disposed || !containerRef.current) {
        return;
      }

      const fontFamily = fontProbeRef.current
        ? window.getComputedStyle(fontProbeRef.current).fontFamily
        : 'serif';
      const lyricCues = getLyricCues(song);
      const theme = getSongSceneTheme(song.theme);
      const lyricLayout = theme.createLayout(song, lyricCues);
      const { positions: mobileLyricPositions, order: mobileLyricOrder } =
        createMobileLayout(song, lyricCues);
      const scene = new Scene();
      scene.background = new Color(song.colors.background);
      scene.fog = new Fog(
        song.colors.background,
        theme.fog.near,
        theme.fog.far,
      );
      const camera = new PerspectiveCamera(43, 1, 0.1, 100);
      camera.position.set(0, 0, 12);

      const renderer = new WebGLRenderer({
        antialias: true,
        alpha: false,
        preserveDrawingBuffer: true,
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.domElement.dataset.lyricsCanvas = 'true';
      renderer.domElement.dataset.songId = song.id;
      renderer.domElement.dataset.sceneInteraction =
        theme.interaction.activation;
      renderer.domElement.setAttribute(
        'aria-label',
        `Interactive three-dimensional lyric scene for ${song.title} by ${song.artist}`,
      );
      renderer.domElement.setAttribute('role', 'img');
      renderer.domElement.className =
        'absolute inset-0 h-full w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--hero-accent)]';
      containerRef.current.appendChild(renderer.domElement);

      const lyricGroup = new Group();
      const airLyricGroup = new Group();
      lyricGroup.add(airLyricGroup);
      scene.add(lyricGroup);

      const atmosphere = createAtmosphere(song, theme);
      scene.add(atmosphere.mesh);
      const environment = theme.createEnvironment(song);
      const environmentInteractions = environment.interactions ?? [];
      if (environmentInteractions.length > 0) {
        renderer.domElement.tabIndex = 0;
        renderer.domElement.setAttribute('role', 'button');
        renderer.domElement.setAttribute(
          'aria-label',
          `${renderer.domElement.getAttribute('aria-label')}. ${environmentInteractions
            .map((target) => target.ariaLabel)
            .join('. ')}. Press Enter or Space to activate.`,
        );
      }
      scene.add(environment.group);
      const groundLyricGroup = environment.lyricSurface ?? new Group();
      if (!environment.lyricSurface) {
        lyricGroup.add(groundLyricGroup);
      }

      const meshes = lyricCues.map((cue, index) => {
        const mesh = createLyricMesh(
          cue,
          index,
          lyricLayout[index],
          fontFamily,
          theme,
        );
        const layer =
          lyricLayout[index].surface === 'ground'
            ? groundLyricGroup
            : airLyricGroup;
        layer.add(mesh);
        return mesh;
      });
      const lyricEchoes = meshes.map((mesh) => {
        return song.colors.echoes.map((color, echoIndex) => {
          const material = new MeshBasicMaterial({
            map: mesh.material.map,
            color,
            transparent: true,
            opacity: 0,
            depthWrite: false,
          });
          const echo = new Mesh(mesh.geometry, material);
          echo.renderOrder = 8 - echoIndex;
          const layer =
            lyricLayout[mesh.userData.index].surface === 'ground'
              ? groundLyricGroup
              : airLyricGroup;
          layer.add(echo);
          return echo;
        });
      });
      meshes.forEach((mesh) => {
        mesh.renderOrder = 10;
      });

      const rippleGeometry =
        theme.interaction.effect === 'none'
          ? null
          : new RingGeometry(0.982, 1, 128);
      const rippleRings = rippleGeometry
        ? song.colors.ripples.map((color, index) => {
            const material = new MeshBasicMaterial({
              color,
              transparent: true,
              opacity: 0,
              depthWrite: false,
              depthTest: true,
              fog: false,
            });
            const ring = new Mesh(rippleGeometry, material);
            ring.visible = false;
            ring.renderOrder = 12 - index;
            groundLyricGroup.add(ring);
            return ring;
          })
        : [];
      const groundLyricIndices = lyricLayout.flatMap((layout, index) =>
        layout.surface === 'ground' ? [index] : [],
      );
      const ambientRippleGeometry = new RingGeometry(0.91, 1, 72);
      const ambientSurfaceRipples = theme.ambientSurfaceRipples
        ? Array.from({ length: 7 }, (_, index) => {
            const material = new MeshBasicMaterial({
              color: song.colors.ripples[index % song.colors.ripples.length],
              transparent: true,
              opacity: 0,
              depthWrite: false,
              depthTest: true,
              fog: false,
            });
            const ring = new Mesh(ambientRippleGeometry, material);
            ring.rotation.order = 'YXZ';
            ring.visible = false;
            ring.renderOrder = 11;
            groundLyricGroup.add(ring);

            return {
              ring,
              duration: 1550 + (index % 4) * 270,
              offset: index * 0.173,
              cycle: Number.NEGATIVE_INFINITY,
            };
          })
        : [];
      const ambientGroundStrengths = new Float32Array(meshes.length);

      const pointer = new Vector2(0, 0);
      const pointerTarget = new Vector2(0, 0);
      const raycaster = new Raycaster();
      const projectedPosition = new Vector3();
      const worldPosition = new Vector3();
      const idleColors = lyricLayout.map((item) => new Color(item.color));
      let hoveredIndex: number | null = null;
      let hoveredEnvironmentTarget:
        | (typeof environmentInteractions)[number]
        | null = null;
      let environmentActivatedAt = Number.NEGATIVE_INFINITY;
      let rippleIndex: number | null = null;
      let rippleStartedAt = Number.NEGATIVE_INFINITY;
      const rippleOrigin = new Vector3();
      const rippleRotation = new Vector3();
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
          meshes.filter(
            (mesh) => mesh.visible && mesh.userData.visibility > 0.15,
          ),
          false,
        )[0];

        return hit ? (hit.object as LyricMesh).userData.index : null;
      };

      const hitTestEnvironment = () => {
        if (environmentInteractions.length === 0) {
          return null;
        }

        raycaster.setFromCamera(pointerTarget, camera);
        const hit = raycaster.intersectObjects(
          environmentInteractions.map((target) => target.object),
          true,
        )[0];
        if (!hit) {
          return null;
        }

        return (
          environmentInteractions.find(
            (target) =>
              hit.object === target.object ||
              target.object.getObjectById(hit.object.id) !== undefined,
          ) ?? null
        );
      };

      const setHoveredEnvironmentTarget = (
        target: (typeof environmentInteractions)[number] | null,
      ) => {
        if (target === hoveredEnvironmentTarget) {
          return;
        }
        hoveredEnvironmentTarget?.onHoverChange(false);
        hoveredEnvironmentTarget = target;
        hoveredEnvironmentTarget?.onHoverChange(true);
      };

      const resize = () => {
        if (!containerRef.current) {
          return;
        }

        const width = containerRef.current.clientWidth;
        const height = containerRef.current.clientHeight;
        const aspect = width / Math.max(height, 1);

        renderer.setSize(width, height, false);
        atmosphere.material.uniforms.uResolution.value.set(
          renderer.domElement.width,
          renderer.domElement.height,
        );
        camera.aspect = aspect;
        camera.fov = aspect < 0.72 ? 55 : 43;
        camera.updateProjectionMatrix();

        const isCompact = aspect < 0.72;
        const compactScale = isCompact
          ? theme.compact.groupScale
          : aspect < 1
            ? 0.84
            : 1;
        lyricGroup.scale.set(compactScale, compactScale, compactScale);
        environment.resize(isCompact);

        meshes.forEach((mesh, index) => {
          const desktopLayout = lyricLayout[index];
          const mobilePosition = mobileLyricPositions[index];
          const usesWorldSurface =
            desktopLayout.surface === 'ground' &&
            Boolean(environment.lyricSurface);
          const isVisible =
            !isCompact || Boolean(mobilePosition) || usesWorldSurface;

          mesh.visible = isVisible;
          lyricEchoes[index].forEach((echo) => {
            echo.visible = isVisible;
          });
          mesh.userData.baseX =
            isCompact && !usesWorldSurface
              ? (mobilePosition?.x ?? desktopLayout.x)
              : desktopLayout.x;
          mesh.userData.baseY =
            isCompact && !usesWorldSurface
              ? (mobilePosition?.y ?? desktopLayout.y)
              : desktopLayout.y;
          mesh.userData.baseZ =
            isCompact && !usesWorldSurface
              ? (mobilePosition?.z ?? desktopLayout.z)
              : desktopLayout.z;
          mesh.userData.baseRotation =
            isCompact && !usesWorldSurface
              ? (mobilePosition?.rotation ?? desktopLayout.rotation * 0.32)
              : desktopLayout.rotation;
          mesh.userData.baseRotationX =
            isCompact && !usesWorldSurface
              ? mobilePosition
                ? 0
                : desktopLayout.rotationX *
                  (desktopLayout.surface === 'ground' ? 0.7 : 0.3)
              : desktopLayout.rotationX;
          mesh.userData.baseRotationY =
            isCompact && !usesWorldSurface
              ? desktopLayout.rotationY * 0.35
              : desktopLayout.rotationY;
          mesh.userData.baseOpacity = isCompact
            ? usesWorldSurface
              ? mobilePosition
                ? Math.max(desktopLayout.opacity, 0.72)
                : Math.max(desktopLayout.opacity * 0.9, 0.3)
              : Math.max(desktopLayout.opacity, theme.compact.minimumOpacity)
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
            mesh.scale.setScalar(isCompact ? theme.compact.textScale : 1);
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

        const target = event.target instanceof Element ? event.target : null;
        if (!isInside || target?.closest('a, button')) {
          hoveredIndex = null;
          setHoveredEnvironmentTarget(null);
          pointerTarget.set(0, 0);
          return;
        }

        const lyricIndex = hitTest(event);
        const environmentTarget = hitTestEnvironment();
        setHoveredEnvironmentTarget(environmentTarget);
        hoveredIndex = environmentTarget ? null : lyricIndex;
      };

      const activateEnvironmentTarget = (event: PointerEvent) => {
        const target = event.target instanceof Element ? event.target : null;
        if (target?.closest('a, button')) {
          return false;
        }

        hitTest(event);
        const environmentTarget = hitTestEnvironment();
        if (!environmentTarget) {
          return false;
        }

        setHoveredEnvironmentTarget(environmentTarget);
        environmentTarget.onActivate();
        environmentActivatedAt = performance.now();
        return true;
      };

      const handlePointerDown = (event: PointerEvent) => {
        if (activateEnvironmentTarget(event)) {
          return;
        }
        triggerRipple(event);
      };

      const handleSceneKeyDown = (event: KeyboardEvent) => {
        if (
          environmentInteractions.length === 0 ||
          (event.key !== 'Enter' && event.key !== ' ')
        ) {
          return;
        }
        event.preventDefault();
        const target = hoveredEnvironmentTarget ?? environmentInteractions[0];
        target?.onActivate();
        environmentActivatedAt = performance.now();
      };

      const triggerRipple = (event: PointerEvent) => {
        if (theme.interaction.activation === 'none') {
          return;
        }

        const target = event.target instanceof Element ? event.target : null;
        if (target?.closest('a, button')) {
          return;
        }

        let hitIndex = hitTest(event);
        if (hitIndex === null && theme.interaction.activation === 'scene') {
          let nearestDistance = Number.POSITIVE_INFINITY;
          meshes.forEach((mesh, index) => {
            if (!mesh.visible || mesh.userData.visibility < 0.15) {
              return;
            }
            mesh.getWorldPosition(worldPosition);
            projectedPosition.copy(worldPosition).project(camera);
            const distance = Math.hypot(
              projectedPosition.x - pointerTarget.x,
              projectedPosition.y - pointerTarget.y,
            );
            if (distance < nearestDistance) {
              nearestDistance = distance;
              hitIndex = index;
            }
          });
        }
        if (hitIndex === null) {
          return;
        }

        hoveredIndex = hitIndex;
        rippleIndex = hitIndex;
        rippleStartedAt = performance.now();
        const data = meshes[hitIndex].userData;
        const rippleLayer =
          data.surface === 'ground' ? groundLyricGroup : airLyricGroup;
        rippleRings.forEach((ring) => {
          rippleLayer.add(ring);
          ring.material.depthTest = data.surface === 'ground';
          ring.rotation.order = data.surface === 'ground' ? 'YXZ' : 'XYZ';
          ring.material.needsUpdate = true;
        });
        rippleOrigin.copy(meshes[hitIndex].position);
        if (data.surface === 'ground') {
          rippleOrigin.y += 0.035;
        } else {
          rippleOrigin.z += 0.06;
        }
        rippleRotation.set(
          data.baseRotationX,
          data.baseRotationY,
          data.baseRotation,
        );
      };

      const prefersReducedMotion = window.matchMedia(
        '(prefers-reduced-motion: reduce)',
      );

      const animate = (time: number) => {
        const reducedMotion = prefersReducedMotion.matches;
        pointer.lerp(pointerTarget, reducedMotion ? 1 : 0.065);
        atmosphere.material.uniforms.uTime.value = reducedMotion
          ? 0
          : time * 0.001;
        atmosphere.material.uniforms.uPointer.value.copy(pointer);
        const entranceElapsed = time - entranceStartedAt;
        const backdropEntrance = reducedMotion
          ? 1
          : MathUtils.clamp(entranceElapsed / 900, 0, 1);
        const rippleAge = time - rippleStartedAt;
        const isRippleActive =
          rippleIndex !== null &&
          rippleAge >= 0 &&
          rippleAge < theme.activationDuration;
        if (rippleIndex !== null && rippleAge >= theme.activationDuration) {
          rippleIndex = null;
        }
        const visualRippleAge = isRippleActive
          ? reducedMotion
            ? theme.activationDuration * 0.36
            : rippleAge
          : 0;
        environment.update({
          time,
          entrance: backdropEntrance,
          reducedMotion,
          pointer,
          activation:
            isRippleActive && rippleIndex !== null
              ? {
                  index: rippleIndex,
                  age: visualRippleAge,
                  progress: MathUtils.clamp(
                    visualRippleAge / theme.activationDuration,
                    0,
                    1,
                  ),
                }
              : null,
        });
        const activeIndex = isRippleActive ? rippleIndex : hoveredIndex;
        renderer.domElement.dataset.activeLyric =
          activeIndex === null ? '' : String(activeIndex);
        renderer.domElement.dataset.lyricMode = isRippleActive
          ? 'ripple'
          : hoveredIndex !== null
            ? 'hovered'
            : 'idle';
        const environmentIsActive =
          time - environmentActivatedAt >= 0 &&
          time - environmentActivatedAt < 1_050;
        renderer.domElement.dataset.sceneInteractionTarget =
          hoveredEnvironmentTarget?.id ?? '';
        renderer.domElement.dataset.sceneInteractionState = environmentIsActive
          ? 'activated'
          : hoveredEnvironmentTarget
            ? 'hovered'
            : 'idle';
        renderer.domElement.style.cursor =
          hoveredEnvironmentTarget ||
          (theme.interaction.activation !== 'none' &&
            (hoveredIndex !== null || theme.interaction.activation === 'scene'))
            ? 'pointer'
            : 'default';

        rippleRings.forEach((ring, index) => {
          const progress = MathUtils.clamp(
            (visualRippleAge - index * 115) / 1180,
            0,
            1,
          );
          const isVisible =
            theme.interaction.effect === 'ripple' &&
            isRippleActive &&
            progress > 0 &&
            progress < 1;
          ring.visible = isVisible;
          if (!isVisible) {
            ring.material.opacity = 0;
            return;
          }

          const easedProgress = 1 - Math.pow(1 - progress, 3);
          ring.position.copy(rippleOrigin);
          if (
            rippleIndex !== null &&
            meshes[rippleIndex].userData.surface === 'ground'
          ) {
            ring.position.y += index * 0.008;
          } else {
            ring.position.z += index * 0.045;
          }
          ring.rotation.set(
            rippleRotation.x,
            rippleRotation.y,
            rippleRotation.z,
          );
          const isGroundRipple =
            rippleIndex !== null &&
            meshes[rippleIndex].userData.surface === 'ground';
          const radius =
            0.12 +
            easedProgress * (isGroundRipple ? 3.05 : theme.ripple.radius);
          const groundRippleScale = isGroundRipple ? 0.9 : theme.ripple.scaleY;
          ring.scale.set(
            radius * theme.ripple.scaleX,
            radius * groundRippleScale,
            1,
          );
          ring.material.opacity =
            Math.sin(progress * Math.PI) *
            (theme.ripple.opacity - index * 0.045) *
            (isGroundRipple ? 0.68 : 1);
        });

        ambientGroundStrengths.fill(0);
        ambientSurfaceRipples.forEach((ripple, rippleIndex) => {
          if (reducedMotion || groundLyricIndices.length === 0) {
            ripple.ring.visible = false;
            return;
          }

          const elapsed = time / ripple.duration + ripple.offset;
          const cycle = Math.floor(elapsed);
          const progress = elapsed - cycle;
          if (cycle !== ripple.cycle) {
            const targetIndex =
              groundLyricIndices[
                Math.abs(cycle * 3 + rippleIndex * 5) %
                  groundLyricIndices.length
              ];
            const target = meshes[targetIndex].userData;
            const jitterX = Math.sin(cycle * 7.31 + rippleIndex) * 0.24;
            const jitterZ = Math.cos(cycle * 5.17 + rippleIndex) * 0.18;
            ripple.ring.position.set(
              target.baseX + jitterX,
              target.baseY + 0.035,
              target.baseZ + jitterZ,
            );
            ripple.ring.rotation.set(
              target.baseRotationX,
              target.baseRotationY,
              target.baseRotation,
            );
            ripple.cycle = cycle;
          }

          const envelope = Math.sin(progress * Math.PI);
          const radius = 0.06 + progress * (1.18 + (rippleIndex % 3) * 0.12);
          ripple.ring.visible = envelope > 0.015;
          ripple.ring.scale.set(radius * 1.08, radius, 1);
          ripple.ring.material.opacity =
            envelope * (0.13 + (rippleIndex % 3) * 0.02);

          groundLyricIndices.forEach((lyricIndex) => {
            const data = meshes[lyricIndex].userData;
            const distance = Math.hypot(
              data.baseX - ripple.ring.position.x,
              data.baseZ - ripple.ring.position.z,
            );
            const waveDistance = Math.abs(distance - radius);
            const strength =
              Math.exp(-Math.pow(waveDistance / 0.24, 2)) * envelope * 0.32;
            ambientGroundStrengths[lyricIndex] = Math.max(
              ambientGroundStrengths[lyricIndex],
              strength,
            );
          });
        });

        airLyricGroup.rotation.x = MathUtils.lerp(
          airLyricGroup.rotation.x,
          reducedMotion || camera.aspect < 0.72 ? 0 : -pointer.y * 0.16,
          0.07,
        );
        airLyricGroup.rotation.y = MathUtils.lerp(
          airLyricGroup.rotation.y,
          reducedMotion || camera.aspect < 0.72 ? 0 : pointer.x * 0.24,
          0.07,
        );
        airLyricGroup.rotation.z = reducedMotion
          ? 0
          : Math.sin(time * 0.00016) * 0.018;
        airLyricGroup.position.z = reducedMotion
          ? 0
          : Math.sin(time * 0.00022) * 0.24;
        const sequencePosition =
          theme.sequence && !reducedMotion
            ? ((((Math.max(entranceElapsed - 700, 0) /
                theme.sequence.duration) *
                theme.sequence.steps +
                (theme.lyricReveal ? -0.5 : 0)) %
                theme.sequence.steps) +
                theme.sequence.steps) %
              theme.sequence.steps
            : 0;
        renderer.domElement.dataset.lyricSequence = theme.sequence
          ? String(Math.floor(sequencePosition + 0.5) % theme.sequence.steps)
          : '';

        let hasWritingLyrics = false;
        let hasHoldingLyrics = false;
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
          let sequenceVisibility = 1;
          let revealProgress = 1;
          if (theme.sequence && data.sequence !== undefined) {
            if (reducedMotion) {
              sequenceVisibility = data.sequence === 0 ? 1 : 0;
              revealProgress = 1;
            } else {
              const halfSteps = theme.sequence.steps / 2;
              const sequencePhase =
                ((((sequencePosition - data.sequence + halfSteps) %
                  theme.sequence.steps) +
                  theme.sequence.steps) %
                  theme.sequence.steps) -
                halfSteps;
              if (theme.lyricReveal?.style === 'scan') {
                const revealStart =
                  -0.5 + (data.revealOrder ?? 0) * theme.lyricReveal.stagger;
                const revealEnd = revealStart + theme.lyricReveal.duration;
                revealProgress = MathUtils.smoothstep(
                  sequencePhase,
                  revealStart,
                  revealEnd,
                );
                sequenceVisibility =
                  MathUtils.smoothstep(sequencePhase, -0.62, -0.5) *
                  (1 - MathUtils.smoothstep(sequencePhase, 0.48, 0.66));
                if (entranceElapsed < 700) {
                  revealProgress = 0;
                  sequenceVisibility = 0;
                }
              } else {
                const sequenceDistance = Math.abs(sequencePhase);
                sequenceVisibility =
                  1 - MathUtils.smoothstep(sequenceDistance, 0.45, 0.55);
              }
            }
          }
          const revealVisibility = theme.lyricReveal
            ? MathUtils.smoothstep(revealProgress, 0, 0.08)
            : 1;
          data.visibility =
            entranceEase * sequenceVisibility * revealVisibility;
          if (
            data.visibility > 0.05 &&
            revealProgress > 0.01 &&
            revealProgress < 0.99
          ) {
            hasWritingLyrics = true;
          } else if (data.visibility > 0.08) {
            hasHoldingLyrics = true;
          }
          const floatY = reducedMotion
            ? 0
            : Math.sin(time * theme.motion.floatSpeed + data.phase) *
              theme.motion.floatY *
              (data.surface === 'ground' ? 0 : 1);
          const floatX = reducedMotion
            ? 0
            : Math.cos(time * 0.00037 + data.phase) *
              theme.motion.floatX *
              (data.surface === 'ground' ? 0 : 1);
          const surfaceTravel =
            data.surface === 'ground' && !reducedMotion
              ? Math.sin(time * 0.00018 + data.phase) * 0.1
              : 0;
          const deltaX = data.baseX - rippleOrigin.x;
          const deltaY = data.baseY - rippleOrigin.y;
          const deltaZ = (data.baseZ - rippleOrigin.z) * 0.45;
          const distanceFromRipple = Math.hypot(deltaX, deltaY, deltaZ);
          const rippleProgress = MathUtils.clamp(
            visualRippleAge / (theme.activationDuration * 0.8),
            0,
            1,
          );
          const waveRadius = rippleProgress * 8.5;
          const radialWaveOffset = distanceFromRipple - waveRadius;
          const signalHeadZ = MathUtils.lerp(4, -24, rippleProgress);
          const signalHeadX = MathUtils.lerp(-8.4, 8.4, rippleProgress);
          const signalWaveOffset =
            theme.interaction.signalAxis === 'horizontal'
              ? data.baseX - signalHeadX
              : data.baseZ - signalHeadZ;
          const waveStrength = isRippleActive
            ? theme.interaction.effect === 'signal'
              ? Math.exp(-Math.pow(signalWaveOffset / 0.92, 2))
              : Math.exp(-Math.pow(radialWaveOffset / 0.62, 2))
            : 0;
          const directionLength = Math.max(Math.hypot(deltaX, deltaY), 0.001);
          const rippleTranslation =
            data.surface === 'ground' || theme.interaction.effect === 'signal'
              ? 0
              : waveStrength * 0.1;
          const targetX =
            data.baseX +
            floatX +
            Math.cos(data.baseRotationY) * surfaceTravel +
            (deltaX / directionLength) * rippleTranslation +
            (index % 2 === 0 ? -1 : 1) * entranceOffset * theme.entrance.x;
          const targetY =
            data.baseY +
            floatY +
            (deltaY / directionLength) * rippleTranslation +
            (theme.lyricReveal
              ? (1 - MathUtils.smoothstep(revealProgress, 0.18, 0.86)) * 0.045
              : 0) +
            entranceOffset * (data.surface === 'ground' ? 0 : theme.entrance.y);
          const targetZ =
            data.baseZ +
            (data.surface === 'ground'
              ? -Math.sin(data.baseRotationY) * surfaceTravel
              : waveStrength * theme.motion.wavePush) -
            entranceOffset * (data.surface === 'ground' ? 0 : theme.entrance.z);
          const groundRainStrength = ambientGroundStrengths[index];
          const targetOpacity =
            (isActive ? 1 : data.baseOpacity) *
            entranceEase *
            sequenceVisibility *
            (data.surface === 'ground' ? 0.94 + groundRainStrength * 0.22 : 1);
          const targetTextScale =
            (camera.aspect < 0.72 ? theme.compact.textScale : 1) *
            (data.surface === 'ground' ? 0.96 : 1) *
            (theme.lyricReveal
              ? MathUtils.lerp(
                  0.965,
                  1,
                  MathUtils.smoothstep(revealProgress, 0.12, 0.9),
                )
              : 1);
          const clickedWaveProgress = MathUtils.clamp(
            visualRippleAge / (theme.activationDuration * 0.8),
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
            groundRainStrength,
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
            (isRippleActive ? visualRippleAge * 0.018 : time * 0.012) -
            distanceFromRipple * 1.4;
          const lyricRevealUniforms = mesh.material.userData.lyricReveal as {
            progress: { value: number };
          };
          lyricRevealUniforms.progress.value = reducedMotion
            ? 1
            : MathUtils.lerp(
                lyricRevealUniforms.progress.value,
                revealProgress,
                0.34,
              );

          mesh.position.x = MathUtils.lerp(mesh.position.x, targetX, 0.07);
          mesh.position.y = MathUtils.lerp(mesh.position.y, targetY, 0.07);
          mesh.position.z = MathUtils.lerp(mesh.position.z, targetZ, 0.08);
          mesh.scale.x = MathUtils.lerp(mesh.scale.x, targetTextScale, 0.09);
          mesh.scale.y = MathUtils.lerp(mesh.scale.y, targetTextScale, 0.09);
          mesh.rotation.z = MathUtils.lerp(
            mesh.rotation.z,
            data.baseRotation +
              (data.surface === 'ground'
                ? 0
                : waveStrength * (deltaX >= 0 ? 0.035 : -0.035)),
            0.08,
          );
          mesh.rotation.x = MathUtils.lerp(
            mesh.rotation.x,
            data.baseRotationX -
              (data.surface === 'ground' ? 0 : waveStrength * 0.035),
            0.08,
          );
          mesh.rotation.y = MathUtils.lerp(
            mesh.rotation.y,
            data.baseRotationY +
              (data.surface === 'ground' ? 0 : waveStrength * 0.045),
            0.08,
          );
          const opacityResponse =
            data.sequence !== undefined && !reducedMotion ? 0.28 : 0.08;
          mesh.material.opacity = MathUtils.lerp(
            mesh.material.opacity,
            targetOpacity,
            opacityResponse,
          );
          if (
            data.sequence !== undefined &&
            sequenceVisibility < 0.01 &&
            mesh.material.opacity < 0.015
          ) {
            mesh.material.opacity = 0;
          }
          mesh.material.color.copy(idleColors[index]);

          lyricEchoes[index].forEach((echo, echoIndex) => {
            const direction = echoIndex === 0 ? -1 : 1;
            echo.position.copy(mesh.position);
            echo.position.x +=
              direction *
              (data.surface === 'ground'
                ? 0.055
                : 0.09 + Math.abs(pointer.x) * 0.05);
            echo.position.y +=
              data.surface === 'ground'
                ? (echoIndex + 1) * 0.008
                : direction * 0.035;
            echo.position.z -=
              data.surface === 'ground' ? 0 : (echoIndex + 1) * 0.28;
            echo.rotation.copy(mesh.rotation);
            echo.scale.copy(mesh.scale);
            echo.material.opacity = MathUtils.lerp(
              echo.material.opacity,
              isActive && isRippleActive
                ? waveStrength * (0.3 - echoIndex * 0.09)
                : isHovered && theme.interaction.hoverEffect === 'echo'
                  ? 0.16 - echoIndex * 0.055
                  : 0,
              0.12,
            );
          });
        });

        renderer.domElement.dataset.lyricState = hasWritingLyrics
          ? 'writing'
          : hasHoldingLyrics
            ? 'holding'
            : 'transition';

        renderer.render(scene, camera);
        frameId = window.requestAnimationFrame(animate);
      };

      const resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(containerRef.current);
      if (
        theme.interaction.activation !== 'none' ||
        environmentInteractions.length > 0
      ) {
        window.addEventListener('pointermove', updatePointer, {
          passive: true,
        });
        window.addEventListener('pointerdown', handlePointerDown);
      }
      if (environmentInteractions.length > 0) {
        renderer.domElement.addEventListener('keydown', handleSceneKeyDown);
      }
      resize();
      meshes.forEach((mesh, index) => {
        if (prefersReducedMotion.matches) {
          mesh.material.opacity = mesh.userData.baseOpacity;
          return;
        }

        mesh.position.x += (index % 2 === 0 ? -1 : 1) * theme.entrance.x;
        if (mesh.userData.surface === 'air') {
          mesh.position.y += theme.entrance.y;
          mesh.position.z -= theme.entrance.z;
        }
        mesh.material.opacity = 0;
      });
      entranceStartedAt = performance.now();
      hasStartedAnimation = true;
      frameId = window.requestAnimationFrame(animate);

      cleanup = () => {
        window.cancelAnimationFrame(frameId);
        resizeObserver.disconnect();
        if (
          theme.interaction.activation !== 'none' ||
          environmentInteractions.length > 0
        ) {
          window.removeEventListener('pointermove', updatePointer);
          window.removeEventListener('pointerdown', handlePointerDown);
        }
        if (environmentInteractions.length > 0) {
          renderer.domElement.removeEventListener(
            'keydown',
            handleSceneKeyDown,
          );
        }
        setHoveredEnvironmentTarget(null);
        meshes.forEach((mesh) => {
          mesh.geometry.dispose();
          mesh.material.map?.dispose();
          mesh.material.dispose();
        });
        lyricEchoes.flat().forEach((echo) => echo.material.dispose());
        rippleGeometry?.dispose();
        rippleRings.forEach((ring) => ring.material.dispose());
        ambientRippleGeometry.dispose();
        ambientSurfaceRipples.forEach((ripple) =>
          ripple.ring.material.dispose(),
        );
        environment.dispose();
        atmosphere.geometry.dispose();
        atmosphere.material.dispose();
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
  }, [song]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 overflow-hidden"
      style={{ backgroundColor: song.colors.background }}
    >
      <span
        ref={fontProbeRef}
        className={`${notoSerif.className} pointer-events-none absolute opacity-0`}
        aria-hidden="true"
      >
        {song.title}
      </span>
    </div>
  );
}
