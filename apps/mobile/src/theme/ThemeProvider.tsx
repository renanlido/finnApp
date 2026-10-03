import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { schemeOf, theme } from '@finnapp/tokens';

type Ctx = ReturnType<typeof schemeOf> & Pick<typeof theme, 'type' | 'space' | 'radius' | 'size' | 'duration' | 'easing'>;

const ThemeContext = createContext<Ctx | null>(null);

/** Tema do design system FinnApp: segue o modo do sistema (escuro é o padrão). */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const value = useMemo<Ctx>(() => ({
    ...schemeOf(system),
    type: theme.type,
    space: theme.space,
    radius: theme.radius,
    size: theme.size,
    duration: theme.duration,
    easing: theme.easing,
  }), [system]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Ctx {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme fora do ThemeProvider');
  return ctx;
}
