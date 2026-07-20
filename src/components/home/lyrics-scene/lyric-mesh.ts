import {
  CanvasTexture,
  Color,
  LinearFilter,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  SRGBColorSpace,
} from 'three';

import type { SongSceneTheme } from './themes';
import type { LyricLayout, LyricMesh } from './types';
import type { SongLyricCue } from '../songs';

export function createLyricMesh(
  cue: SongLyricCue,
  index: number,
  layout: LyricLayout,
  fontFamily: string,
  theme: SongSceneTheme,
) {
  const { text } = cue;
  const fontSize = 86;
  const paddingX = 40;
  const paddingY = 28;
  const pixelRatio = 2;
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  const isVertical = layout.writingMode === 'vertical';

  if (!context) {
    throw new Error('Unable to create lyric texture context.');
  }

  context.font = `600 ${fontSize}px ${fontFamily}`;
  const characters = Array.from(text);
  const textWidth = Math.ceil(
    isVertical
      ? Math.max(
          ...characters.map(
            (character) => context.measureText(character).width,
          ),
        )
      : context.measureText(text).width,
  );
  const logicalWidth = textWidth + paddingX * 2;
  const lineHeight = fontSize * 1.02;
  const logicalHeight = isVertical
    ? Math.ceil(characters.length * lineHeight + paddingY * 2)
    : fontSize + paddingY * 2;

  canvas.width = logicalWidth * pixelRatio;
  canvas.height = logicalHeight * pixelRatio;
  context.scale(pixelRatio, pixelRatio);
  context.font = `600 ${fontSize}px ${fontFamily}`;
  context.fillStyle = '#ffffff';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  if (isVertical) {
    characters.forEach((character, characterIndex) => {
      context.fillText(
        character,
        logicalWidth / 2,
        paddingY + lineHeight * (characterIndex + 0.5),
      );
    });
  } else {
    context.fillText(text, logicalWidth / 2, logicalHeight / 2 + 2);
  }

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.minFilter = LinearFilter;
  texture.magFilter = LinearFilter;

  const width = isVertical
    ? layout.size
    : (logicalWidth / logicalHeight) * layout.size;
  const height = isVertical
    ? (logicalHeight / logicalWidth) * width
    : layout.size;
  const geometry = new PlaneGeometry(width, height, 48, 8);
  const material = new MeshBasicMaterial({
    map: texture,
    color: new Color(layout.color),
    transparent: true,
    opacity: layout.opacity,
    depthWrite: false,
    fog: layout.surface !== 'ground',
  });
  material.userData.lyricWave = {
    strength: { value: 0 },
    phase: { value: 0 },
    rain: { value: theme.textWaveAxis === 'vertical' ? 1 : 0 },
    ground: { value: layout.surface === 'ground' ? 1 : 0 },
  };
  material.userData.lyricReveal = {
    enabled: { value: theme.lyricReveal?.style === 'scan' ? 1 : 0 },
    glow: { value: new Color(theme.lyricReveal?.glowColor ?? '#ffffff') },
    progress: { value: theme.lyricReveal ? 0 : 1 },
    vertical: { value: isVertical ? 1 : 0 },
  };
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uLyricWaveStrength = material.userData.lyricWave.strength;
    shader.uniforms.uLyricWavePhase = material.userData.lyricWave.phase;
    shader.uniforms.uLyricWaveRain = material.userData.lyricWave.rain;
    shader.uniforms.uLyricWaveGround = material.userData.lyricWave.ground;
    shader.uniforms.uLyricRevealEnabled = material.userData.lyricReveal.enabled;
    shader.uniforms.uLyricRevealGlow = material.userData.lyricReveal.glow;
    shader.uniforms.uLyricRevealProgress =
      material.userData.lyricReveal.progress;
    shader.uniforms.uLyricRevealVertical =
      material.userData.lyricReveal.vertical;
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform float uLyricWaveStrength;
        uniform float uLyricWavePhase;
        uniform float uLyricWaveRain;
        uniform float uLyricWaveGround;
        uniform float uLyricRevealProgress;`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        float lyricWaveAxis = mix(uv.x, uv.y, uLyricWaveRain);
        float lyricWaveEnvelope = mix(
          sin(uv.x * 3.14159265),
          sin(uv.y * 3.14159265),
          uLyricWaveRain
        );
        float lyricWaveFrequency = mix(15.0, 10.0, uLyricWaveRain);
        float lyricWave = sin(lyricWaveAxis * lyricWaveFrequency - uLyricWavePhase) * lyricWaveEnvelope;
        transformed.z += lyricWave * uLyricWaveStrength * 0.14 * (1.0 - uLyricWaveGround);
        transformed.y += cos(uv.x * 10.0 - uLyricWavePhase * 0.82) * lyricWaveEnvelope * uLyricWaveStrength * 0.045 * (1.0 - uLyricWaveRain);
        transformed.x += sin(uv.y * 12.0 - uLyricWavePhase * 0.7) * lyricWaveEnvelope * uLyricWaveStrength * 0.035 * uLyricWaveRain;
        transformed.y += cos(uv.x * 11.0 - uLyricWavePhase * 0.72) * lyricWaveEnvelope * uLyricWaveStrength * 0.024 * uLyricWaveGround;`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform float uLyricRevealEnabled;
        uniform float uLyricRevealProgress;
        uniform float uLyricRevealVertical;
        uniform vec3 uLyricRevealGlow;`,
      )
      .replace(
        '#include <map_fragment>',
        `#include <map_fragment>
        float lyricRevealAxis = mix(vMapUv.x, 1.0 - vMapUv.y, uLyricRevealVertical);
        float lyricRevealMask = 1.0 - smoothstep(
          uLyricRevealProgress,
          uLyricRevealProgress + 0.045,
          lyricRevealAxis
        );
        lyricRevealMask = mix(1.0, lyricRevealMask, uLyricRevealEnabled);
        float lyricRevealHead = exp(
          -pow((lyricRevealAxis - uLyricRevealProgress) / 0.035, 2.0)
        );
        float lyricRevealAfterglow = exp(
          -pow((lyricRevealAxis - (uLyricRevealProgress - 0.09)) / 0.11, 2.0)
        );
        lyricRevealHead *= step(0.01, uLyricRevealProgress) * step(uLyricRevealProgress, 0.99);
        lyricRevealHead *= uLyricRevealEnabled;
        lyricRevealAfterglow *= step(0.04, uLyricRevealProgress) * step(uLyricRevealProgress, 0.99);
        lyricRevealAfterglow *= uLyricRevealEnabled * sampledDiffuseColor.a;
        diffuseColor.a *= lyricRevealMask;
        diffuseColor.rgb += uLyricRevealGlow * lyricRevealAfterglow * 0.12;
        diffuseColor.rgb = mix(
          diffuseColor.rgb,
          uLyricRevealGlow,
          lyricRevealHead * sampledDiffuseColor.a * 0.78
        );`,
      );
  };
  material.customProgramCacheKey = () => `lyric-wave-v3-${theme.id}`;

  const mesh = new Mesh(geometry, material) as LyricMesh;
  if (layout.surface === 'ground') {
    mesh.rotation.order = 'YXZ';
  }
  mesh.position.set(layout.x, layout.y, layout.z);
  mesh.rotation.set(layout.rotationX, layout.rotationY, layout.rotation);
  mesh.userData = {
    cueId: cue.id,
    index,
    baseX: layout.x,
    baseY: layout.y,
    baseZ: layout.z,
    baseRotation: layout.rotation,
    baseRotationX: layout.rotationX,
    baseRotationY: layout.rotationY,
    baseOpacity: layout.opacity,
    phase: index * 0.83,
    surface: layout.surface ?? 'air',
    sequence: layout.sequence,
    revealOrder: layout.revealOrder,
    visibility: 1,
  };

  return mesh;
}
