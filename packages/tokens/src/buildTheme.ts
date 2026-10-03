/** Converte o tokens.json do design system FinnApp no tema do app React Native. Função pura. */

type Themed = string | Record<string, string>;
interface TokenList { tokens: { name: string; value: string }[] }
interface TypeStyle { name: string; fontSize: string; lineHeight: number | string; fontWeight: number; letterSpacing?: string; family?: string }
export interface TokensJson {
  color: { themes: { id: string }[]; tokens: { name: string; value: Themed }[] };
  type: { families: Record<string, string>; groups: { family: string; styles: TypeStyle[] }[] };
  spacing: TokenList;
  radius: TokenList;
  size: TokenList;
  shadow: { tokens: { name: string; value: Themed }[] };
  duration: TokenList;
  easing: TokenList;
}

export interface TextStyle { fontFamily: string; fontSize: number; lineHeight: number; letterSpacing: number }
export type Scheme = 'dark' | 'light';
export interface Theme {
  colors: Record<Scheme, Record<string, string>>;
  shadows: Record<Scheme, Record<string, string>>;
  type: Record<string, TextStyle>;
  space: Record<string, number>;
  radius: Record<string, number>;
  size: Record<string, number>;
  duration: Record<string, number>;
  easing: Record<string, number[]>;
}

const camel = (name: string) => name.replace(/-([a-z0-9])/g, (_, c: string) => c.toUpperCase());
const px = (v: string) => Number.parseFloat(v);
const strip = (name: string, prefix: string) => name.slice(prefix.length);

/** Nome da fonte como o @expo-google-fonts registra (Urbanist_700Bold, InstrumentSans_600SemiBold). */
const WEIGHT: Record<number, string> = { 400: 'Regular', 500: 'Medium', 600: 'SemiBold', 700: 'Bold', 800: 'ExtraBold' };
const FAMILY: Record<string, string> = { display: 'Urbanist', text: 'InstrumentSans' };

function fontFamily(family: string, weight: number): string {
  const base = FAMILY[family];
  const w = WEIGHT[weight];
  if (!base || !w) throw new Error(`Fonte sem mapeamento: ${family} ${weight}`);
  return `${base}_${weight}${w}`;
}

function resolveThemed(list: { name: string; value: Themed }[], scheme: Scheme, first: Scheme): Record<string, string> {
  const raw = new Map(list.map((t) => [t.name, t.value]));
  const pick = (v: Themed) => (typeof v === 'string' ? v : v[scheme] ?? v[first] ?? '');
  const resolve = (name: string, depth = 0): string => {
    if (depth > 16) throw new Error(`Apelido em ciclo: ${name}`);
    const v = raw.get(name);
    if (v === undefined) throw new Error(`Token inexistente: ${name}`);
    const value = pick(v);
    return value.startsWith('{') ? resolve(value.slice(1, -1), depth + 1) : value;
  };
  return Object.fromEntries(list.map((t) => [camel(t.name), resolve(t.name)]));
}

export function buildTheme(tokens: TokensJson): Theme {
  const first = tokens.color.themes[0]?.id as Scheme;
  const schemes: Scheme[] = ['dark', 'light'];
  const colors = Object.fromEntries(schemes.map((s) => [s, resolveThemed(tokens.color.tokens, s, first)])) as Theme['colors'];
  const shadows = Object.fromEntries(schemes.map((s) => [s, resolveThemed(tokens.shadow.tokens, s, first)])) as Theme['shadows'];

  const type: Record<string, TextStyle> = {};
  for (const group of tokens.type.groups) {
    for (const style of group.styles) {
      const size = px(style.fontSize);
      const lh = typeof style.lineHeight === 'number' ? Math.round(size * style.lineHeight) : px(style.lineHeight);
      const ls = style.letterSpacing?.endsWith('em') ? Math.round(size * px(style.letterSpacing) * 100) / 100 : px(style.letterSpacing ?? '0');
      type[camel(style.name)] = { fontFamily: fontFamily(style.family ?? group.family, style.fontWeight), fontSize: size, lineHeight: lh, letterSpacing: ls || 0 };
    }
  }

  const numbers = (list: TokenList, prefix: string) => Object.fromEntries(list.tokens.map((t) => [strip(t.name, prefix), px(t.value)]));
  const easing = Object.fromEntries(tokens.easing.tokens.map((t) => {
    const m = /cubic-bezier\(([^)]*)\)/.exec(t.value);
    if (!m) throw new Error(`Curva inválida: ${t.name}`);
    return [strip(t.name, 'ease-'), m[1]!.split(',').map((n) => Number(n.trim()))];
  }));

  return {
    colors,
    shadows,
    type,
    space: numbers(tokens.spacing, 'space-'),
    radius: numbers(tokens.radius, 'radius-'),
    size: numbers(tokens.size, 'size-'),
    duration: numbers(tokens.duration, 'duration-'),
    easing,
  };
}
