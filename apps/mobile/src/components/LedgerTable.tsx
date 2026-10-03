import { Text, View } from 'react-native';
import type { CashLine } from '@finnapp/domain';
import { useTheme } from '../theme/ThemeProvider';

const SIGN = { '': '', '+': '+', '-': '−', '=': '=' } as const;
const SPOKEN = { '': '', '+': 'mais ', '-': 'menos ', '=': 'igual a ' } as const;

/** A conta que fecha: saldo inicial + entradas − saídas = saldo final, com sinal em cada linha. */
export function LedgerTable({ lines, caption, hidden = false }: { lines: CashLine[]; caption?: string; hidden?: boolean }) {
  const { colors, type, space, radius } = useTheme();
  return (
    <View style={{ marginTop: space[14] }}>
      <View style={{ paddingVertical: space[4], paddingHorizontal: space[14], borderRadius: radius.l, backgroundColor: colors.surfaceInset }}>
        {lines.map((line, i) => {
          const total = line.sign === '=';
          const value = hidden ? '•••' : line.amount.format();
          const valueColor = total && line.amount.isNegative() ? colors.negativeText : line.sign === '+' ? colors.accent : colors.text;
          return (
            <View
              key={line.kind}
              accessible
              accessibilityLabel={`${SPOKEN[line.sign]}${line.label}: ${hidden ? 'valor oculto' : value}`}
              style={{
                flexDirection: 'row',
                alignItems: 'baseline',
                gap: space[10],
                paddingVertical: space[8],
                borderTopWidth: i === 0 ? 0 : total ? 1.5 : 1,
                borderTopColor: total ? colors.borderStrong : colors.border,
              }}
            >
              <Text style={[type.txtS, { width: 12, fontFamily: type.txtL.fontFamily, color: colors.textMuted }]}>{SIGN[line.sign]}</Text>
              <Text style={[total ? type.txtLabel : type.txtS, { flex: 1, color: colors.text }]}>{line.label}</Text>
              <Text style={[type.amountS, { color: valueColor, fontFamily: total ? 'Urbanist_800ExtraBold' : type.amountS.fontFamily }]}>{value}</Text>
            </View>
          );
        })}
      </View>
      {caption ? <Text style={[type.txtMeta, { marginTop: space[10], color: colors.textMuted }]}>{caption}</Text> : null}
    </View>
  );
}
