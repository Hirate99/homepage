export type SongThemeId = 'california-afterimage' | 'rain-night';

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
  cueId: string;
  x: number;
  y: number;
  z: number;
  rotation: number;
}

export type SongLyricRole = 'anchor' | 'echo' | 'ground' | 'horizon' | 'title';

export interface SongLyricCue {
  id: string;
  text: string;
  section: string;
  role?: SongLyricRole;
}

export interface SongDefinition {
  id: string;
  title: string;
  artist: string;
  lyrics: string;
  lyricCues: SongLyricCue[];
  theme: SongThemeId;
  colors: SongColors;
  mobileLyrics: SongMobileLyric[];
}
