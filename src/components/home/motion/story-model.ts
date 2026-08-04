export const HOME_STORY_STOPS = {
  settle: 0.18,
  departure: 0.46,
  handoff: 0.7,
  atlas: 0.94,
} as const;

export type HomeStoryPhase = 'arrival' | 'inhabit' | 'departure' | 'handoff';

export interface HomeStoryFrame {
  atlasArrival: number;
  departure: number;
  handoff: number;
  journey: number;
  phase: HomeStoryPhase;
  progress: number;
}

function clamp01(value: number) {
  return Math.min(Math.max(value, 0), 1);
}

function smoothRange(value: number, start: number, end: number) {
  const progress = clamp01((value - start) / (end - start));
  return progress * progress * (3 - 2 * progress);
}

/**
 * The shared narrative clock for the home page.
 *
 * Components consume semantic beats rather than inventing their own scroll
 * thresholds, so WebGL, DOM depth and the Atlas bridge stay in the same story.
 */
export function getHomeStoryFrame(progress: number): HomeStoryFrame {
  const normalizedProgress = clamp01(progress);
  const journey = smoothRange(normalizedProgress, 0.04, 0.52);
  const departure = smoothRange(
    normalizedProgress,
    HOME_STORY_STOPS.departure,
    HOME_STORY_STOPS.atlas,
  );
  const handoff = smoothRange(normalizedProgress, HOME_STORY_STOPS.handoff, 1);
  const atlasArrival = smoothRange(
    normalizedProgress,
    HOME_STORY_STOPS.atlas,
    1,
  );

  const phase: HomeStoryPhase =
    normalizedProgress < HOME_STORY_STOPS.settle
      ? 'arrival'
      : normalizedProgress < HOME_STORY_STOPS.departure
        ? 'inhabit'
        : normalizedProgress < HOME_STORY_STOPS.handoff
          ? 'departure'
          : 'handoff';

  return {
    atlasArrival,
    departure,
    handoff,
    journey,
    phase,
    progress: normalizedProgress,
  };
}
