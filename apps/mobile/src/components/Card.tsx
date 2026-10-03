import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

type Tone = 'surface' | 'accent' | 'negative' | 'warning';

/** Card do design system: um assunto por card, título curto, o número logo abaixo. */
export function Card({ title, subtitle, tone = 'surface', children }: { title?: string; subtitle?: string; tone?: Tone; children?: ReactNode }) {
  const { colors, shadows, type, space, radius } = useTheme();
  const background = { surface: colors.surface, accent: colors.accentSurface, negative: colors.negativeSurface, warning: colors.warningSurface }[tone];
  const titleColor = tone === 'negative' ? colors.negativeText : tone === 'warning' ? colors.warningText : colors.text;
  return (
    <View
      accessibilityRole={title ? 'summary' : undefined}
      style={{ padding: space[20], borderRadius: radius['2xl'], backgroundColor: background, boxShadow: shadows.shadowCard }}
    >
      {title ? <Text style={[type.txtStrong, { color: titleColor }]}>{title}</Text> : null}
      {subtitle ? <Text style={[type.txtCaption, { color: colors.textMuted, marginTop: space[2] }]}>{subtitle}</Text> : null}
      {children}
    </View>
  );
}
