'use client';

import { useState } from 'react';

import { useResize } from './use-resize';

const BreakingPoints = ['mobile', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] as const;

export type TBreakingPoints = (typeof BreakingPoints)[number];

const breakingPointIndex = (point: TBreakingPoints) => {
  return BreakingPoints.findIndex((val) => val === point);
};

export type TBreakingPointSizeConfig<T = number> = Partial<
  Record<TBreakingPoints, T>
>;

const fillBreakingPointArray = <T>(
  config: TBreakingPointSizeConfig<T>,
  key: TBreakingPoints,
  value: T,
  fill = false,
) => {
  return Object.values(BreakingPoints).reduce<TBreakingPointSizeConfig<T>>(
    (prev, curr, index) => {
      const shouldFill = fill || index >= breakingPointIndex(key);
      return {
        ...prev,
        [curr]: shouldFill ? value : config[curr],
      };
    },
    {},
  );
};

export function createBreakingPointSizes<T>(
  config: TBreakingPointSizeConfig<T>,
) {
  const configs = Object.entries(config).sort((a, b) => {
    return (
      breakingPointIndex(a.at(0) as TBreakingPoints) -
      breakingPointIndex(b.at(0) as TBreakingPoints)
    );
  });

  return configs.reduce(
    (prev, [key, value], index) =>
      fillBreakingPointArray(prev, key as TBreakingPoints, value, !index),
    {},
  ) as Record<TBreakingPoints, T>;
}

const calCurentWidth = () => {
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
export function useBreakingPoint<T>(map?: TBreakingPointSizeConfig<T>) {
  const [width, setWidth] = useState<TBreakingPoints>();

  useResize(() => {
    setWidth(calCurentWidth());
  });

  return {
    responsive: width,
    sizes: map ? createBreakingPointSizes(map) : undefined,
  };
}
