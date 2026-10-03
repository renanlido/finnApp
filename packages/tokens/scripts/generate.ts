// Gera src/theme.ts a partir do tokens.json. Rode depois de copiar um tokens.json novo do design system.
import { readFileSync, writeFileSync } from 'node:fs';
import { buildTheme, type TokensJson } from '../src/buildTheme.ts';

const root = new URL('../', import.meta.url);
const tokens = JSON.parse(readFileSync(new URL('tokens.json', root), 'utf8')) as TokensJson;
const theme = buildTheme(tokens);

const body = `// GERADO por scripts/generate.ts a partir de tokens.json (design system FinnApp). Não edite à mão.
import type { Theme } from './buildTheme';

export const theme = ${JSON.stringify(theme, null, 2)} as const satisfies Theme;
`;
writeFileSync(new URL('src/theme.ts', root), body);
console.log(`theme.ts: ${Object.keys(theme.colors.dark).length} cores, ${Object.keys(theme.type).length} estilos de texto`);
