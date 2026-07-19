export type SongThemeId = 'heat-tunnel' | 'rain-night';

export interface SongColors {
  background: string;
  ink: string;
  accent: string;
  signal: string;
  rule: string;
  lyrics: string[];
  echoes: [string, string];
  structure: string;
  ripples: string[];
}

export interface SongMobileLyric {
  text: string;
  x: number;
  y: number;
  z: number;
  rotation: number;
}

export interface SongDefinition {
  id: string;
  title: string;
  artist: string;
  lyrics: string;
  theme: SongThemeId;
  colors: SongColors;
  mobileLyrics: SongMobileLyric[];
}
