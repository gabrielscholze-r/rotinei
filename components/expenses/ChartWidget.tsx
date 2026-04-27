import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { ExpenseChart, Expense, ExpenseSection, CustomCategory } from '../../lib/types';
import { isInPeriod, periodLabel } from '../../lib/billing';
import { getCategoryLabel, getCategoryColor, getCategoryIcon } from '../../lib/categoryUtils';
import { PieChart, PieSlice } from './PieChart';
import { Colors } from '../../constants/colors';

const SCREEN_WIDTH = Dimensions.get('window').width;

interface ChartWidgetProps {
  chart: ExpenseChart;
  expenses: Expense[];
  sections: ExpenseSection[];
  customCategories: CustomCategory[];
  cycleDay: number;
  onDelete: (id: string) => void;
}

function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function getPeriodSubtitle(chart: ExpenseChart, cycleDay: number): string {
  if (chart.periodType === 'billing_period' && chart.billingPeriodKey) {
    return periodLabel(chart.billingPeriodKey, cycleDay);
  }
  if (chart.periodType === 'calendar_month' && chart.calendarMonth) {
    const [year, month] = chart.calendarMonth.split('-');
    const date = new Date(Number(year), Number(month) - 1, 1);
    return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  }
  if (chart.periodType === 'custom_range' && chart.rangeStart && chart.rangeEnd) {
    const fmt = (s: string) => {
      const [y, m, d] = s.split('-');
      return `${d}/${m}/${y}`;
    };
    return `${fmt(chart.rangeStart)} – ${fmt(chart.rangeEnd)}`;
  }
  return '';
}

function buildSlices(
  filtered: Expense[],
  customCategories: CustomCategory[],
): PieSlice[] {
  const totals: Record<string, number> = {};
  for (const e of filtered) {
    totals[e.category] = (totals[e.category] ?? 0) + e.amount;
  }

  const total = Object.values(totals).reduce((s, v) => s + v, 0);
  if (total === 0) return [];

  const sorted = Object.entries(totals).sort((a, b) => b[1] - a[1]);

  const TOP = 6;
  const top = sorted.slice(0, TOP);
  const rest = sorted.slice(TOP);

  const slices: PieSlice[] = top.map(([cat, value]) => ({
    key: cat,
    label: getCategoryLabel(cat, customCategories),
    value,
    percentage: (value / total) * 100,
    color: getCategoryColor(cat, customCategories),
    emoji: getCategoryIcon(cat, customCategories),
  }));

  if (rest.length > 0) {
    const restTotal = rest.reduce((s, [, v]) => s + v, 0);
    slices.push({
      key: '__outros__',
      label: 'Outros',
      value: restTotal,
      percentage: (restTotal / total) * 100,
      color: '#6B7280',
      emoji: '📦',
    });
  }

  return slices;
}

export function ChartWidget({ chart, expenses, sections: _sections, customCategories, cycleDay, onDelete }: ChartWidgetProps) {
  const [minimized, setMinimized] = useState(false);
  let filtered = expenses;

  if (chart.sectionIds !== null) {
    filtered = filtered.filter((e) =>
      chart.sectionIds!.includes(e.sectionId ?? '__none__')
    );
  }

  if (chart.periodType === 'billing_period' && chart.billingPeriodKey) {
    filtered = filtered.filter((e) => isInPeriod(e.date, chart.billingPeriodKey!, cycleDay));
  } else if (chart.periodType === 'calendar_month' && chart.calendarMonth) {
    filtered = filtered.filter((e) => e.date.startsWith(chart.calendarMonth!));
  } else if (chart.periodType === 'custom_range' && chart.rangeStart && chart.rangeEnd) {
    filtered = filtered.filter((e) => {
      const d = e.date.slice(0, 10);
      return d >= chart.rangeStart! && d <= chart.rangeEnd!;
    });
  }

  const slices = buildSlices(filtered, customCategories);
  const subtitle = getPeriodSubtitle(chart, cycleDay);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.name} numberOfLines={1}>{chart.name}</Text>
          {!!subtitle && <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>}
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => setMinimized((v) => !v)} hitSlop={8}>
            <Ionicons name={minimized ? 'chevron-down' : 'chevron-up'} size={18} color={Colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onDelete(chart.id)} hitSlop={8}>
            <Ionicons name="trash-outline" size={18} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>

      {!minimized && (
        slices.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>Nenhum gasto neste período</Text>
          </View>
        ) : (
          <PieChart slices={slices} size={180} />
        )
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: SCREEN_WIDTH - 48,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerLeft: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
  },
  subtitle: {
    fontSize: 12,
    color: '#64748B',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyStateText: {
    fontSize: 13,
    color: '#94A3B8',
  },
});
