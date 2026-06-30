import { useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ColorPalette } from '../../../constants/colors';
import { useTheme } from '../../../contexts/ThemeContext';
import {
  CATEGORY_COLORS,
  CATEGORY_ICONS,
  CATEGORY_LABELS,
  Expense,
  ExpenseCategory,
  ExpenseSection,
  WidgetSize,
} from '../../../lib/types';
import { isExpenseInCurrentPeriod } from '../../../lib/billing';

interface Props {
  expenses: Expense[];
  cycleDay: number;
  sections: ExpenseSection[];
  size?: WidgetSize;
}

const fmt = (v: number) =>
  `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function ExpenseSummaryWidget({ expenses, cycleDay, sections, size = 'medium' }: Props) {
  const router = useRouter();
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);

  const periodExpenses = expenses.filter((e) => isExpenseInCurrentPeriod(e, sections, cycleDay));
  const total = periodExpenses.reduce((sum, e) => sum + e.amount, 0);

  const categoryTotals = periodExpenses.reduce(
    (acc, e) => {
      const cat = e.category || 'other';
      acc[cat] = (acc[cat] || 0) + e.amount;
      return acc;
    },
    {} as Record<string, number>
  );

  const maxCats = size === 'large' ? 3 : 2;
  const topCats = Object.entries(categoryTotals)
    .sort(([, a], [, b]) => b - a)
    .slice(0, maxCats);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push('/(tabs)/expenses')}
      activeOpacity={0.85}
    >
      <View style={styles.topRow}>
        <View style={styles.iconContainer}>
          <Text style={{ fontSize: 20 }}>💰</Text>
        </View>
        <Text style={styles.label}>Gastos do período</Text>
      </View>

      <Text style={styles.total}>{fmt(total)}</Text>

      {topCats.length > 0 ? (
        <View style={styles.catList}>
          {topCats.map(([cat, amount]) => {
            const color = CATEGORY_COLORS[cat as ExpenseCategory] ?? '#94A3B8';
            const icon = CATEGORY_ICONS[cat as ExpenseCategory] ?? '📦';
            const label = CATEGORY_LABELS[cat as ExpenseCategory] ?? cat;
            const pct = total > 0 ? amount / total : 0;
            return (
              <View key={cat} style={styles.catRow}>
                <Text style={styles.catIcon}>{icon}</Text>
                <Text style={styles.catLabel} numberOfLines={1}>
                  {label}
                </Text>
                <View style={styles.catBarTrack}>
                  <View
                    style={[
                      styles.catBarFill,
                      {
                        width: `${Math.round(pct * 100)}%` as any,
                        backgroundColor: color,
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.catAmount, { color }]}>{fmt(amount)}</Text>
              </View>
            );
          })}
        </View>
      ) : (
        <Text style={styles.empty}>Nenhum gasto neste período</Text>
      )}
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
      gap: 8,
      minHeight: 100,
    },
    topRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    iconContainer: {
      width: 34,
      height: 34,
      borderRadius: 10,
      backgroundColor: Colors.dangerLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    label: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },
    total: { fontSize: 22, fontWeight: '800', color: Colors.text },
    catList: { gap: 6, marginTop: 2 },
    catRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    catIcon: { fontSize: 13, width: 18 },
    catLabel: { fontSize: 12, color: Colors.textSecondary, width: 76 },
    catBarTrack: {
      flex: 1,
      height: 5,
      backgroundColor: Colors.borderLight,
      borderRadius: 3,
      overflow: 'hidden',
    },
    catBarFill: { height: '100%', borderRadius: 3 },
    catAmount: { fontSize: 12, fontWeight: '600', minWidth: 76, textAlign: 'right' },
    empty: { fontSize: 13, color: Colors.textTertiary },
  });
}
