import { useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ColorPalette } from '../../../constants/colors';
import { useTheme } from '../../../contexts/ThemeContext';
import { Expense, ExpenseSection } from '../../../lib/types';
import { isExpenseInCurrentPeriod } from '../../../lib/billing';

interface Props {
  expenses: Expense[];
  cycleDay: number;
  sections: ExpenseSection[];
}

export function ExpenseSummaryWidget({ expenses, cycleDay, sections }: Props) {
  const router = useRouter();
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);

  const periodExpenses = expenses.filter((e) => isExpenseInCurrentPeriod(e, sections, cycleDay));
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

function createStyles(Colors: ColorPalette) {
  return StyleSheet.create({
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
      backgroundColor: Colors.dangerLight,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 4,
    },
    label: { fontSize: 12, color: Colors.textSecondary, fontWeight: '500' },
    total: { fontSize: 20, fontWeight: '800', color: Colors.danger },
    sub: { fontSize: 12, color: Colors.textTertiary },
  });
}
