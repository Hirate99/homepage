'use client';

import { useMemo } from 'react';

import {
  createBreakpointValueMap,
  type Breakpoint,
  type BreakpointValueConfig,
} from '@/lib/breakpoints';

import { useViewport } from './use-resize';

export type TBreakingPoints = Breakpoint;
export type TBreakingPointSizeConfig<T = number> = BreakpointValueConfig<T>;

export function createBreakingPointSizes<T>(
  config: TBreakingPointSizeConfig<T>,
) {
  return createBreakpointValueMap(config);
}

export function useBreakpoint() {
  return useViewport().breakpoint;
}

export function useBreakpointValue<T>(map: TBreakingPointSizeConfig<T>) {
  const breakpoint = useBreakpoint();
  const sizes = useMemo(() => createBreakingPointSizes(map), [map]);

  return sizes[breakpoint];
}

export function useBreakingPoint<T>(map: TBreakingPointSizeConfig<T>): {
  responsive: TBreakingPoints;
  sizes: Record<TBreakingPoints, T>;
};
export function useBreakingPoint<T>(): {
  responsive: TBreakingPoints;
  sizes: undefined;
};
export function useBreakingPoint<T>(map?: TBreakingPointSizeConfig<T>) {
  const responsive = useBreakpoint();

  const sizes = useMemo(() => {
    return map ? createBreakingPointSizes(map) : undefined;
  }, [map]);

  return {
    responsive,
    sizes,
  };
}
