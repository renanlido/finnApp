import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { buildTheme } from '../src/buildTheme';
import { theme } from '../src/theme';

const source = JSON.parse(readFileSync(new URL('../tokens.json', import.meta.url), 'utf8'));
const built = buildTheme(source);

describe('tema do app a partir do tokens.json do design system', () => {
  it('escuro e claro têm exatamente as mesmas cores', () => {
    expect(Object.keys(built.colors.dark).sort()).toEqual(Object.keys(built.colors.light).sort());
    expect(Object.keys(built.colors.dark).length).toBe(source.color.tokens.length);
  });

  it('nomes viram camelCase', () => {
    expect(built.colors.dark.surfaceInset).toBe('#222226');
    expect(built.colors.light.catMoradia).toBe('#B4532F');
  });

  it('resolve apelidos por tema', () => {
    expect(built.colors.dark.surfaceSegment).toBe('#161619');
    expect(built.colors.light.surfaceSegment).toBe('#EAE6DF');
    expect(built.colors.dark.focusRing).toBe('#FF905F');
    expect(built.colors.light.catReceita).toBe('#5E4FD1');
  });

  it('só entrega cores que o React Native entende', () => {
    for (const scheme of ['dark', 'light'] as const) {
      for (const value of Object.values(built.colors[scheme])) {
        expect(value).toMatch(/^(#[0-9A-Fa-f]{6}|rgba\([\d.,\s]+\))$/);
      }
    }
  });

  it('converte tipo para valores absolutos e para a fonte carregada', () => {
    expect(built.type.amount).toEqual({ fontFamily: 'Urbanist_700Bold', fontSize: 16, lineHeight: 19, letterSpacing: 0 });
    expect(built.type.amountXl!.letterSpacing).toBeCloseTo(-1.6);
    expect(built.type.txtBody!.fontFamily).toBe('InstrumentSans_400Regular');
    expect(built.type.txtStrong!.fontFamily).toBe('InstrumentSans_600SemiBold');
  });

  it('espaço, raio e tamanho viram números', () => {
    expect(built.space[12]).toBe(12);
    expect(built.radius.full).toBe(999);
    expect(built.radius['2xl']).toBe(28);
    expect(built.size.touch).toBe(44);
    expect(built.duration.undo).toBe(6000);
    expect(built.easing.enter).toEqual([0.32, 0.72, 0, 1]);
  });

  it('src/theme.ts está atualizado com o tokens.json (rode pnpm tokens)', () => {
    expect(theme).toEqual(built);
  });
});
