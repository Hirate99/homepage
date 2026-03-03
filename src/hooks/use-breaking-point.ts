'use client';

import { useCallback, useMemo, useState } from 'react';

import { useResize } from './use-resize';

const BreakingPoints = ['mobile', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] as const;

export type TBreakingPoints = (typeof BreakingPoints)[number];

const BreakingPointIndex = new Map<TBreakingPoints, number>(
  BreakingPoints.map((point, index) => [point, index]),
);

const getBreakingPointIndex = (point: TBreakingPoints) => {
  return BreakingPointIndex.get(point) ?? -1;
};

export type TBreakingPointSizeConfig<T = number> = Partial<
  Record<TBreakingPoints, T>
>;

export function createBreakingPointSizes<T>(
  config: TBreakingPointSizeConfig<T>,
) {
  const sortedConfig = Object.entries(config).sort((a, b) => {
    return (
      getBreakingPointIndex(a[0] as TBreakingPoints) -
      getBreakingPointIndex(b[0] as TBreakingPoints)
    );
  }) as [TBreakingPoints, T][];

  const result = {} as Record<TBreakingPoints, T>;
  let cursor = 0;
  let currentValue: T | undefined;

  for (const point of BreakingPoints) {
    while (cursor < sortedConfig.length && sortedConfig[cursor][0] === point) {
      currentValue = sortedConfig[cursor][1];
      cursor += 1;
    }

    if (currentValue !== undefined) {
      result[point] = currentValue;
    }
  }

  return result;
}

const calculateCurrentWidth = () => {
  if (typeof window !== 'undefined') {
    const windowWidth = window.innerWidth;
    if (windowWidth < 520) {
      return 'mobile';
    } else if (windowWidth < 640) {
      return 'xs';
    } else if (windowWidth < 768) {
      return 'sm';
    } else if (windowWidth < 1024) {
      return 'md';
    } else if (windowWidth < 1280) {
      return 'lg';
    } else if (windowWidth < 1536) {
      return 'xl';
    } else {
      return '2xl';
    }
  }
  return 'md';
};

export function useBreakingPoint<T>(map: TBreakingPointSizeConfig<T>): {
  responsive: TBreakingPoints;
  sizes: Record<TBreakingPoints, T>;
};
export function useBreakingPoint<T>(): {
  responsive: TBreakingPoints;
  sizes: undefined;
};
export function useBreakingPoint<T>(map?: TBreakingPointSizeConfig<T>) {
  const [width, setWidth] = useState<TBreakingPoints>(() =>
    calculateCurrentWidth(),
  );

  const handleResize = useCallback(() => {
    const next = calculateCurrentWidth();
    setWidth((prev) => (prev === next ? prev : next));
  }, []);

  useResize(handleResize);

  const sizes = useMemo(() => {
    return map ? createBreakingPointSizes(map) : undefined;
  }, [map]);

  return {
    responsive: width,
    sizes,
  };
}
