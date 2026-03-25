export const BREAKPOINTS = {
  mobile: 0,
  xs: 520,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

export const BREAKPOINT_ORDER = Object.keys(BREAKPOINTS) as Breakpoint[];

export type Breakpoint = keyof typeof BREAKPOINTS;

export type BreakpointValueConfig<T = number> = Partial<Record<Breakpoint, T>>;

export function getBreakpoint(width: number): Breakpoint {
  if (width < BREAKPOINTS.xs) {
    return 'mobile';
  }
  if (width < BREAKPOINTS.sm) {
    return 'xs';
  }
  if (width < BREAKPOINTS.md) {
    return 'sm';
  }
  if (width < BREAKPOINTS.lg) {
    return 'md';
  }
  if (width < BREAKPOINTS.xl) {
    return 'lg';
  }
  if (width < BREAKPOINTS['2xl']) {
    return 'xl';
  }
  return '2xl';
}

export function createBreakpointValueMap<T>(config: BreakpointValueConfig<T>) {
  const result = {} as Record<Breakpoint, T>;
  let currentValue: T | undefined;

  for (const breakpoint of BREAKPOINT_ORDER) {
    if (config[breakpoint] !== undefined) {
      currentValue = config[breakpoint];
    }

    if (currentValue !== undefined) {
      result[breakpoint] = currentValue;
    }
  }

  return result;
}
