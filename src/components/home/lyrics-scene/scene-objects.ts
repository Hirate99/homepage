import { Color, Mesh, PlaneGeometry, ShaderMaterial, Vector2 } from 'three';

import type { SongDefinition } from '../songs';
import type { SongSceneTheme } from './themes';

export function createAtmosphere(song: SongDefinition, theme: SongSceneTheme) {
  const geometry = new PlaneGeometry(2, 2);
  const material = new ShaderMaterial({
    uniforms: {
      uResolution: { value: new Vector2(1, 1) },
      uTime: { value: 0 },
      uPointer: { value: new Vector2() },
      uRain: { value: theme.atmosphereMix },
      uBackground: { value: new Color(song.colors.background) },
      uAccent: { value: new Color(song.colors.accent) },
      uSignal: { value: new Color(song.colors.signal) },
    },
    vertexShader: `
      void main() {
        gl_Position = vec4(position.xy, 1.0, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec2 uResolution;
      uniform float uTime;
      uniform float uRain;
      uniform vec2 uPointer;
      uniform vec3 uBackground;
      uniform vec3 uAccent;
      uniform vec3 uSignal;

      float hash21(vec2 value) {
        value = fract(value * vec2(123.34, 345.45));
        value += dot(value, value + 34.345);
        return fract(value.x * value.y);
      }

      void main() {
        vec2 uv = gl_FragCoord.xy / max(uResolution, vec2(1.0));
        vec2 centered = uv - 0.5;
        centered.x *= uResolution.x / max(uResolution.y, 1.0);
        float grain = hash21(floor(gl_FragCoord.xy * 0.48) + floor(uTime * 9.0));
        vec3 color = uBackground;

        float heatBand = sin((uv.y + sin(uv.x * 9.0) * 0.035 + uTime * 0.018) * 38.0);
        float heatMask = smoothstep(0.82, 1.0, heatBand) * 0.024;
        color += uAccent * heatMask * (1.0 - uRain);

        float column = floor(uv.x * 84.0);
        float dropSeed = hash21(vec2(column, floor(uv.y * 3.0)));
        float dropY = fract(uv.y * 2.1 + uTime * (0.18 + dropSeed * 0.22) + dropSeed);
        float dropX = abs(fract(uv.x * 84.0) - 0.5);
        float rainLine = (1.0 - smoothstep(0.015, 0.09, dropX)) * smoothstep(0.72, 0.98, dropY);
        float wetGlass = sin(uv.y * 27.0 + hash21(vec2(column, 2.0)) * 6.2831 + uTime * 0.34);
        wetGlass = smoothstep(0.94, 1.0, wetGlass) * 0.035;
        float windowLight = exp(-length(centered - vec2(0.22 + uPointer.x * 0.035, 0.08)) * 4.8);
        float blueHour = exp(-abs(uv.y - 0.56) * 5.5);
        float nightVignette = 1.0 - smoothstep(0.18, 0.92, length(centered));
        color += uAccent * (rainLine * 0.16 + wetGlass + blueHour * 0.025) * uRain;
        color += uSignal * windowLight * 0.09 * uRain;
        color *= mix(1.0, 0.76 + nightVignette * 0.24, uRain);
        color += (grain - 0.5) * mix(0.012, 0.018, uRain);

        gl_FragColor = vec4(color, 1.0);
      }
    `,
    depthTest: false,
    depthWrite: false,
    fog: false,
  });
  const mesh = new Mesh(geometry, material);
  mesh.frustumCulled = false;
  mesh.renderOrder = -100;

  return { mesh, geometry, material };
}
