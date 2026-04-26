import { useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors } from '../../../constants/colors';
import { Expense } from '../../../lib/types';
import { currentPeriodKey, isInPeriod } from '../../../lib/billing';

interface Props {
  expenses: Expense[];
  cycleDay: number;
}

export function ExpenseSummaryWidget({ expenses, cycleDay }: Props) {
  const router = useRouter();
  const periodKey = currentPeriodKey(cycleDay);
  const periodExpenses = expenses.filter((e) => isInPeriod(e.date, periodKey, cycleDay));
  const total = periodExpenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push('/(tabs)/expenses')}
      activeOpacity={0.85}
    >
      <View style={styles.iconRow}>
        <View style={styles.iconContainer}>
          <Text style={{ fontSize: 22 }}>💰</Text>
        </View>
      </View>
      <Text style={styles.label}>Gastos do período</Text>
      <Text style={styles.total}>
        {`R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
      </Text>
      <Text style={styles.sub}>{periodExpenses.length} lançamento{periodExpenses.length !== 1 ? 's' : ''}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 4,
    minHeight: 100,
  },
  iconRow: { flexDirection: 'row' },
  iconContainer: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  label: { fontSize: 12, color: Colors.textSecondary, fontWeight: '500' },
  total: { fontSize: 20, fontWeight: '800', color: Colors.danger },
  sub: { fontSize: 12, color: Colors.textTertiary },
});
