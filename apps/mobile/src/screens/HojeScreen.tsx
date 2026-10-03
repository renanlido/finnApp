import { ScrollView, Text, View } from 'react-native';
import { Card } from '../components/Card';
import { LedgerTable } from '../components/LedgerTable';
import { demoStatement } from '../demo/ledger';
import { useTheme } from '../theme/ThemeProvider';

export function HojeScreen() {
  const { colors, type, space } = useTheme();
  const s = demoStatement();
  const internal = s.internalTransfers.isZero() ? '' : `Transferências entre suas contas (${s.internalTransfers.format()}) não contam como entrada nem saída. `;
  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ paddingTop: space[56], paddingHorizontal: space[20], paddingBottom: space[40], gap: space[12] }}>
      <Text accessibilityRole="header" style={[type.titleScreen, { color: colors.text }]}>Hoje</Text>
      <Card title="Saldo hoje · todas as contas">
        <Text style={[type.amountXl, { color: colors.text, marginTop: space[4] }]}>{s.closing.format()}</Text>
        <LedgerTable
          lines={s.lines()}
          caption={`${internal}Compra no cartão só sai do saldo quando a fatura é paga.`}
        />
      </Card>
      {!s.reconciles() ? (
        <Card tone="negative" title="A conta não fechou" subtitle="O saldo final não bate com as linhas. Isso é um erro do app." />
      ) : null}
      <View style={{ height: space[8] }} />
    </ScrollView>
  );
}
