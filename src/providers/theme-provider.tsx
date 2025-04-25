'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { ThemeProviderProps } from 'next-themes/dist/types';

import { useMounted } from '@/hooks/use-mounted';

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  const mounted = useMounted();

  return mounted ? (
    <NextThemesProvider {...props}>{children}</NextThemesProvider>
  ) : (
    <>{children}</>
  );
}
