export { theme } from './theme';
export { buildTheme, type Theme, type Scheme, type TextStyle, type TokensJson } from './buildTheme';
import { theme } from './theme';
import type { Scheme } from './buildTheme';

export type ColorName = keyof (typeof theme)['colors']['dark'];

/** Cores e sombras de um esquema (useColorScheme() devolve 'dark' | 'light'). */
export function schemeOf(scheme: string | null | undefined) {
  const s: Scheme = scheme === 'light' ? 'light' : 'dark';
  return { scheme: s, colors: theme.colors[s], shadows: theme.shadows[s] };
}
