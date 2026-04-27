import {
  View, Text, Modal, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Platform, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import {
  ExpenseChart, ChartPeriodType, ExpenseSection,
  Expense, CustomCategory,
} from '../../lib/types';
import {
  currentPeriodKey, prevPeriodKey, nextPeriodKey, periodLabel, isInPeriod,
} from '../../lib/billing';
import { getCategoryLabel, getCategoryColor, getCategoryIcon } from '../../lib/categoryUtils';
import { PieChart, PieSlice } from './PieChart';
import { Colors } from '../../constants/colors';

const MONTH_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

interface CreateChartModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (chart: ExpenseChart) => void;
  sections: ExpenseSection[];
  cycleDay: number;
  expenses: Expense[];
  customCategories: CustomCategory[];
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('pt-BR');
}

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function buildPreviewSlices(
  expenses: Expense[],
  customCategories: CustomCategory[],
  periodType: ChartPeriodType,
  billingPeriodKey: string,
  calendarMonth: string,
  rangeStart: Date,
  rangeEnd: Date,
  sectionIds: string[] | null,
  cycleDay: number,
): PieSlice[] {
  let filtered = expenses;

  if (sectionIds !== null) {
    filtered = filtered.filter((e) =>
      sectionIds.includes(e.sectionId ?? '__none__')
    );
  }

  if (periodType === 'billing_period') {
    filtered = filtered.filter((e) => isInPeriod(e.date, billingPeriodKey, cycleDay));
  } else if (periodType === 'calendar_month') {
    filtered = filtered.filter((e) => e.date.startsWith(calendarMonth));
  } else {
    const rs = toDateStr(rangeStart);
    const re = toDateStr(rangeEnd);
    filtered = filtered.filter((e) => {
      const d = e.date.slice(0, 10);
      return d >= rs && d <= re;
    });
  }

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

export function CreateChartModal({
  visible, onClose, onSave, sections, cycleDay, expenses, customCategories,
}: CreateChartModalProps) {
  const now = new Date();
  const [name, setName] = useState('');
  const [periodType, setPeriodType] = useState<ChartPeriodType>('billing_period');
  const [billingPeriodKey, setBillingPeriodKey] = useState(() => currentPeriodKey(cycleDay));
  const [calendarMonthNum, setCalendarMonthNum] = useState(now.getMonth() + 1);
  const [calendarYear, setCalendarYear] = useState(String(now.getFullYear()));
  const [rangeStart, setRangeStart] = useState(new Date(now.getFullYear(), now.getMonth(), 1));
  const [rangeEnd, setRangeEnd] = useState(now);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [sectionIds, setSectionIds] = useState<string[] | null>(null);

  function reset() {
    setName('');
    setPeriodType('billing_period');
    setBillingPeriodKey(currentPeriodKey(cycleDay));
    setCalendarMonthNum(now.getMonth() + 1);
    setCalendarYear(String(now.getFullYear()));
    setRangeStart(new Date(now.getFullYear(), now.getMonth(), 1));
    setRangeEnd(now);
    setSectionIds(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handleSave() {
    if (!name.trim()) {
      Alert.alert('Erro', 'Informe um nome para o gráfico.');
      return;
    }
    if (periodType === 'custom_range' && toDateStr(rangeEnd) < toDateStr(rangeStart)) {
      Alert.alert('Erro', 'A data final deve ser igual ou posterior à data inicial.');
      return;
    }

    const yearNum = parseInt(calendarYear, 10) || now.getFullYear();
    const monthStr = `${yearNum}-${String(calendarMonthNum).padStart(2, '0')}`;

    const chart: ExpenseChart = {
      id: Date.now().toString(),
      name: name.trim(),
      periodType,
      billingPeriodKey: periodType === 'billing_period' ? billingPeriodKey : undefined,
      calendarMonth: periodType === 'calendar_month' ? monthStr : undefined,
      rangeStart: periodType === 'custom_range' ? toDateStr(rangeStart) : undefined,
      rangeEnd: periodType === 'custom_range' ? toDateStr(rangeEnd) : undefined,
      sectionIds,
      createdAt: new Date().toISOString(),
    };
    reset();
    onSave(chart);
  }

  const isCurrentOrFuture = billingPeriodKey >= currentPeriodKey(cycleDay);

  const yearNum = parseInt(calendarYear, 10) || now.getFullYear();
  const calendarMonthStr = `${yearNum}-${String(calendarMonthNum).padStart(2, '0')}`;

  const previewSlices = buildPreviewSlices(
    expenses, customCategories,
    periodType, billingPeriodKey, calendarMonthStr,
    rangeStart, rangeEnd, sectionIds, cycleDay,
  );

  function toggleSection(id: string) {
    if (sectionIds === null) {
      const next = allSectionIds.filter((sid) => sid !== id);
      setSectionIds(next);
      return;
    }
    const isSelected = sectionIds.includes(id);
    if (isSelected && sectionIds.length === 1) return;
    const next = isSelected ? sectionIds.filter((s) => s !== id) : [...sectionIds, id];
    setSectionIds(next.length === allSectionIds.length ? null : next);
  }

  const allSectionOptions = [
    { id: '__none__', name: 'Sem fatura', color: Colors.textTertiary },
    ...sections.map((s) => ({ id: s.id, name: s.name, color: s.color })),
  ];
  const allSectionIds = allSectionOptions.map((s) => s.id);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Novo gráfico</Text>
          <TouchableOpacity onPress={handleClose}>
            <Ionicons name="close" size={24} color={Colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* Name */}
          <Text style={styles.label}>Nome *</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: Gastos de Abril, Fatura Nubank..."
            placeholderTextColor={Colors.textTertiary}
            value={name}
            onChangeText={setName}
          />

          {/* Period type */}
          <Text style={styles.label}>Período</Text>
          <View style={styles.pills}>
            {([
              ['billing_period', 'Período atual'],
              ['calendar_month', 'Mês calendário'],
              ['custom_range', 'Intervalo livre'],
            ] as [ChartPeriodType, string][]).map(([type, label]) => (
              <TouchableOpacity
                key={type}
                style={[styles.pill, periodType === type && styles.pillActive]}
                onPress={() => setPeriodType(type)}
              >
                <Text style={[styles.pillText, periodType === type && styles.pillTextActive]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Billing period nav */}
          {periodType === 'billing_period' && (
            <View style={styles.periodNav}>
              <TouchableOpacity
                style={styles.periodNavBtn}
                onPress={() => setBillingPeriodKey(prevPeriodKey(billingPeriodKey, cycleDay))}
              >
                <Ionicons name="chevron-back" size={20} color={Colors.primary} />
              </TouchableOpacity>
              <Text style={styles.periodNavLabel}>{periodLabel(billingPeriodKey, cycleDay)}</Text>
              <TouchableOpacity
                style={[styles.periodNavBtn, isCurrentOrFuture && styles.periodNavBtnDisabled]}
                onPress={() => !isCurrentOrFuture && setBillingPeriodKey(nextPeriodKey(billingPeriodKey, cycleDay))}
                disabled={isCurrentOrFuture}
              >
                <Ionicons name="chevron-forward" size={20} color={isCurrentOrFuture ? Colors.textTertiary : Colors.primary} />
              </TouchableOpacity>
            </View>
          )}

          {/* Calendar month picker */}
          {periodType === 'calendar_month' && (
            <View style={styles.monthPicker}>
              <View style={styles.monthGrid}>
                {MONTH_LABELS.map((m, i) => {
                  const active = calendarMonthNum === i + 1;
                  return (
                    <TouchableOpacity
                      key={m}
                      style={[styles.monthBtn, active && styles.monthBtnActive]}
                      onPress={() => setCalendarMonthNum(i + 1)}
                    >
                      <Text style={[styles.monthBtnText, active && styles.monthBtnTextActive]}>{m}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <View style={styles.yearRow}>
                <Text style={styles.yearLabel}>Ano:</Text>
                <TextInput
                  style={styles.yearInput}
                  keyboardType="number-pad"
                  value={calendarYear}
                  onChangeText={setCalendarYear}
                  maxLength={4}
                  placeholderTextColor={Colors.textTertiary}
                />
              </View>
            </View>
          )}

          {/* Custom range */}
          {periodType === 'custom_range' && (
            <View style={styles.rangeRow}>
              <View style={styles.rangeItem}>
                <Text style={styles.rangeLabel}>De:</Text>
                <TouchableOpacity style={styles.dateBtn} onPress={() => setShowStartPicker(true)}>
                  <Text style={styles.dateBtnText}>{formatDate(rangeStart)}</Text>
                </TouchableOpacity>
                {showStartPicker && (
                  <DateTimePicker
                    value={rangeStart}
                    mode="date"
                    display="default"
                    onChange={(_, selected) => {
                      setShowStartPicker(Platform.OS === 'ios');
                      if (selected) setRangeStart(selected);
                    }}
                  />
                )}
              </View>
              <View style={styles.rangeItem}>
                <Text style={styles.rangeLabel}>Até:</Text>
                <TouchableOpacity style={styles.dateBtn} onPress={() => setShowEndPicker(true)}>
                  <Text style={styles.dateBtnText}>{formatDate(rangeEnd)}</Text>
                </TouchableOpacity>
                {showEndPicker && (
                  <DateTimePicker
                    value={rangeEnd}
                    mode="date"
                    display="default"
                    onChange={(_, selected) => {
                      setShowEndPicker(Platform.OS === 'ios');
                      if (selected) setRangeEnd(selected);
                    }}
                  />
                )}
              </View>
            </View>
          )}

          {/* Fatura selection */}
          <Text style={styles.label}>Faturas incluídas</Text>
          <View style={styles.sectionChips}>
            {allSectionOptions.map((s) => {
              const active = sectionIds === null || sectionIds.includes(s.id);
              return (
                <TouchableOpacity
                  key={s.id}
                  style={[styles.chip, active && { borderColor: s.color, backgroundColor: s.color + '18' }]}
                  onPress={() => toggleSection(s.id)}
                >
                  <View style={[styles.chipDot, { backgroundColor: s.color }]} />
                  <Text style={[styles.chipText, active && { color: s.color, fontWeight: '700' }]} numberOfLines={1}>
                    {s.name}
                  </Text>
                  {active && <Ionicons name="checkmark" size={14} color={s.color} />}
                </TouchableOpacity>
              );
            })}
          </View>
          <TouchableOpacity
            style={[styles.allBtn, sectionIds === null && styles.allBtnActive]}
            onPress={() => setSectionIds(null)}
          >
            <Ionicons
              name={sectionIds === null ? 'checkmark-circle' : 'ellipse-outline'}
              size={20}
              color={sectionIds === null ? Colors.primary : Colors.textTertiary}
            />
            <Text style={[styles.allBtnText, sectionIds === null && styles.allBtnTextActive]}>Selecionar todas</Text>
          </TouchableOpacity>

          {/* Preview */}
          <Text style={styles.label}>Pré-visualização</Text>
          <View style={styles.previewCard}>
            <PieChart slices={previewSlices} size={160} />
          </View>

          {/* Save */}
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
            <Text style={styles.saveBtnText}>Salvar gráfico</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.card,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
  },
  scroll: {
    flex: 1,
    paddingHorizontal: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginTop: 20,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.text,
  },
  pills: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
  },
  pillActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLighter,
  },
  pillText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  pillTextActive: {
    color: Colors.primary,
  },
  periodNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 10,
  },
  periodNavBtn: {
    padding: 4,
  },
  periodNavBtnDisabled: {
    opacity: 0.3,
  },
  periodNavLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  monthPicker: {
    gap: 12,
    marginTop: 4,
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  monthBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    minWidth: 52,
    alignItems: 'center',
  },
  monthBtnActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  monthBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  monthBtnTextActive: {
    color: '#fff',
  },
  yearRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  yearLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  yearInput: {
    backgroundColor: Colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
    color: Colors.text,
    width: 90,
    textAlign: 'center',
  },
  rangeRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  rangeItem: {
    flex: 1,
    gap: 6,
  },
  rangeLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  dateBtn: {
    backgroundColor: Colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  dateBtnText: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '600',
  },
  allBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.card,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 8,
  },
  allBtnActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLighter,
  },
  allBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  allBtnTextActive: {
    color: Colors.primary,
  },
  sectionChips: {
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.card,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  chipDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  chipText: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
  },
  previewCard: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    alignItems: 'center',
  },
  saveBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 40,
  },
  saveBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
  },
});
